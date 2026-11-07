package app.adveil.browser

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Intent
import android.content.IntentSender
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.RevokeAccessRequest
import com.google.android.gms.common.api.Scope
import androidx.webkit.JavaScriptExecutionWorld
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.webkit.ScriptHandler
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Locale

class MainActivity : Activity() {
    private data class BrowserTab(
        val view: WebView,
        var title: String = "Nova aba",
        var shortenerCode: String? = null,
        var shortenerExpiry: Long = 0,
        val shortenerSteps: MutableSet<String> = mutableSetOf(),
        val scriptHandlers: MutableList<ScriptHandler> = mutableListOf(),
    )

    private val tabs = mutableListOf<BrowserTab>()
    private lateinit var root: LinearLayout
    private lateinit var webContainer: LinearLayout
    private lateinit var address: EditText
    private lateinit var status: TextView
    private lateinit var tabCounter: TextView
    private lateinit var blocker: AdBlocker
    private lateinit var dataStore: BrowserDataStore
    private lateinit var prefs: android.content.SharedPreferences
    private var selectedTab = 0
    private var injectionSupported = false
    private var googleSyncInProgress = false
    private val syncHandler = android.os.Handler(android.os.Looper.getMainLooper())
    private val syncRequest = Runnable { requestGoogleAuthorization(showErrors = false) }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("adveil-browser", MODE_PRIVATE)
        dataStore = BrowserDataStore(this)
        blocker = AdBlocker(this)
        syncBlocker()
        injectionSupported = WebViewFeature.isFeatureSupported(WebViewFeature.JS_INJECTION_IN_FRAME_AND_WORLD)

        root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
        }
        val toolbar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(8), dp(8), dp(8), dp(4))
        }
        val omnibox = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            background = roundedBackground(Color.rgb(241, 243, 244), 28)
            setPadding(dp(12), 0, dp(4), 0)
            minimumHeight = dp(48)
        }
        omnibox.addView(TextView(this).apply {
            text = "⌕"
            textSize = 23f
            setTextColor(Color.rgb(95, 99, 104))
            gravity = Gravity.CENTER
            contentDescription = "Pesquisar ou digitar endereço"
        }, LinearLayout.LayoutParams(dp(28), dp(44)))
        address = EditText(this).apply {
            isSingleLine = true
            hint = "Pesquisar ou digitar endereço"
            textSize = 16f
            setTextColor(Color.rgb(32, 33, 36))
            setHintTextColor(Color.rgb(95, 99, 104))
            setSelectAllOnFocus(true)
            background = null
            setPadding(dp(4), 0, dp(4), 0)
            imeOptions = EditorInfo.IME_ACTION_GO
            setOnEditorActionListener { _, action, _ -> if (action == EditorInfo.IME_ACTION_GO) { navigate(text.toString()); true } else false }
        }
        omnibox.addView(address, LinearLayout.LayoutParams(0, dp(44), 1f))
        omnibox.addView(iconAction("↻", "Recarregar página") { currentView()?.reload() }, LinearLayout.LayoutParams(dp(40), dp(44)))
        toolbar.addView(omnibox, LinearLayout.LayoutParams(0, dp(48), 1f))
        tabCounter = iconAction("1", "Abas abertas") { showTabs() }
        toolbar.addView(tabCounter, LinearLayout.LayoutParams(dp(44), dp(48)))
        toolbar.addView(iconAction("⋮", "Mais opções") { showBrowserMenu() }, LinearLayout.LayoutParams(dp(40), dp(48)))
        root.addView(toolbar)

        val protectionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(18), 0, dp(18), dp(6))
        }
        status = TextView(this).apply {
            setTextColor(Color.rgb(24, 128, 56))
            textSize = 12f
        }
        protectionRow.addView(status)
        root.addView(protectionRow)
        webContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        root.addView(webContainer, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f))

        val bottomBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = GradientDrawable().apply {
                setColor(Color.WHITE)
                setStroke(dp(1), Color.rgb(232, 234, 237))
            }
        }
        bottomBar.addView(iconAction("‹", "Voltar") { currentView()?.let { if (it.canGoBack()) it.goBack() } }, weightedToolbarItem())
        bottomBar.addView(iconAction("›", "Avançar") { currentView()?.let { if (it.canGoForward()) it.goForward() } }, weightedToolbarItem())
        bottomBar.addView(iconAction("⌂", "Página inicial") { newTab("https://www.google.com") }, weightedToolbarItem())
        bottomBar.addView(iconAction("★", "Adicionar aos favoritos") { toggleCurrentBookmark() }, weightedToolbarItem())
        bottomBar.addView(iconAction("＋", "Nova aba") { newTab() }, weightedToolbarItem())
        root.addView(bottomBar, LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(52)))
        setContentView(root)

        newTab("https://www.google.com")
        refreshStatus()
    }

    private fun button(label: String, width: Int, action: () -> Unit) = Button(this).apply {
        text = label
        minWidth = width
        setPadding(4, 2, 4, 2)
        setOnClickListener { action() }
    }

    private fun iconAction(label: String, description: String, action: () -> Unit) = TextView(this).apply {
        text = label
        textSize = if (label.length > 1) 17f else 23f
        gravity = Gravity.CENTER
        minWidth = dp(40)
        minHeight = dp(44)
        setTextColor(Color.rgb(95, 99, 104))
        contentDescription = description
        isClickable = true
        isFocusable = true
        setOnClickListener { action() }
    }

    private fun weightedToolbarItem() = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f)

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()

    private fun roundedBackground(color: Int, radiusDp: Int) = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        cornerRadius = dp(radiusDp).toFloat()
        setColor(color)
    }

    private fun showBrowserMenu() {
        val options = arrayOf("Nova aba", "Abas abertas", "Favoritos e histórico", "Grupos de abas salvas", "Configurações do AdVeil")
        android.app.AlertDialog.Builder(this)
            .setItems(options) { _, which ->
                when (which) {
                    0 -> newTab()
                    1 -> showTabs()
                    2 -> showLibrary()
                    3 -> showSavedTabGroups()
                    4 -> showAdVeilSettings()
                }
            }
            .show()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun newTab(initialUrl: String = "https://www.google.com") {
        val web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.javaScriptCanOpenWindowsAutomatically = false
            webChromeClient = object : WebChromeClient() {
                override fun onReceivedTitle(view: WebView, title: String?) {
                    tabs.firstOrNull { it.view === view }?.title = title?.takeIf { it.isNotBlank() } ?: "Nova aba"
                }
            }
        }
        val tab = BrowserTab(web)
        tabs.add(tab)
        selectedTab = tabs.lastIndex
        runCatching { configurePageProtection(tab) }
            .onFailure { Log.w("AdVeil", "Proteção de página indisponível nesta WebView", it) }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                runCatching { blocker.intercept(request, view.url) }
                    .onFailure { Log.w("AdVeil", "Falha ao filtrar uma solicitação", it) }
                    .getOrNull()
            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                observeShortenerNavigation(tab, url)
                if (currentView() === view) address.setText(url)
                refreshStatus()
            }
            override fun onPageFinished(view: WebView, url: String) {
                if (currentView() === view) address.setText(url)
                runCatching {
                    dataStore.recordVisit(url, tabs.firstOrNull { it.view === view }?.title ?: view.title.orEmpty())
                }.onFailure { Log.w("AdVeil", "Não foi possível salvar esta visita no histórico", it) }
                scheduleGoogleSync()
                refreshStatus()
            }
            override fun onRenderProcessGone(view: WebView, detail: android.webkit.RenderProcessGoneDetail): Boolean {
                val index = tabs.indexOfFirst { it.view === view }
                if (index >= 0) closeTab(index)
                return true
            }
        }
        showTab(selectedTab)
        web.loadUrl(initialUrl)
        refreshStatus()
    }

    private fun showTab(index: Int) {
        if (index !in tabs.indices) return
        selectedTab = index
        webContainer.removeAllViews()
        val view = tabs[index].view
        (view.parent as? ViewGroup)?.removeView(view)
        webContainer.addView(view, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        address.setText(view.url.orEmpty())
        tabCounter.text = tabs.size.coerceAtLeast(1).toString()
        refreshStatus()
    }

    private fun showTabs() {
        if (tabs.isEmpty()) return
        val labels = tabs.mapIndexed { i, tab ->
            val host = runCatching { android.net.Uri.parse(tab.view.url).host }.getOrNull()
            "${if (i == selectedTab) "● " else ""}${tab.title}  ${host.orEmpty()}"
        }.toTypedArray()
        android.app.AlertDialog.Builder(this)
            .setTitle("Abas abertas")
            .setItems(labels) { _, which -> showTab(which) }
            .setNeutralButton("Fechar aba atual") { _, _ -> closeTab(selectedTab) }
            .setPositiveButton("Nova aba") { _, _ -> newTab() }
            .show()
    }

    private fun closeTab(index: Int) {
        if (index !in tabs.indices) return
        val tab = tabs.removeAt(index)
        webContainer.removeView(tab.view)
        runCatching { tab.view.stopLoading() }
        runCatching { tab.view.destroy() }
        if (tabs.isEmpty()) newTab() else showTab(index.coerceAtMost(tabs.lastIndex))
    }

    private fun showAdVeilSettings() {
        val panel = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(24, 12, 24, 8) }
        val protection = Switch(this).apply {
            text = "Proteção de rede AdVeil"
            isChecked = prefs.getBoolean("enabled", true)
        }
        panel.addView(protection)

        val profileLabel = TextView(this).apply { text = "Perfil"; setPadding(0, 18, 0, 4) }
        panel.addView(profileLabel)
        val profileGroup = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
        val balanced = RadioButton(this).apply { id = View.generateViewId(); text = "Equilibrado — anúncios e regional" }
        val strong = RadioButton(this).apply { id = View.generateViewId(); text = "Reforçado — inclui rastreadores" }
        val companion = RadioButton(this).apply { id = View.generateViewId(); text = "Complemento — ajustes sem listas" }
        profileGroup.addView(balanced)
        profileGroup.addView(strong)
        profileGroup.addView(companion)
        val selectedProfile = prefs.getString("profile", "balanced")
        profileGroup.check(when (selectedProfile) { "strong" -> strong.id; "companion" -> companion.id; else -> balanced.id })
        panel.addView(profileGroup)

        val pageProtection = Switch(this).apply {
            text = "Camuflagem e proteção contra abas"
            isChecked = prefs.getBoolean("page_protection", true)
            isEnabled = injectionSupported
        }
        panel.addView(pageProtection)
        val shorteners = Switch(this).apply {
            text = "Atalhos de encurtadores"
            isChecked = prefs.getBoolean("shorteners", true)
            isEnabled = injectionSupported
        }
        panel.addView(shorteners)

        val site = currentHost()
        val disabled = prefs.getStringSet("disabled_hosts", emptySet()).orEmpty().toMutableSet()
        val isPaused = site != null && disabled.contains(site)
        val pause = Button(this).apply {
            text = if (isPaused) "Retomar proteção em $site" else "Pausar proteção neste site"
            isEnabled = site != null
        }
        panel.addView(pause)
        val editAllow = Button(this).apply { text = "Permitir domínios" }
        val editBlock = Button(this).apply { text = "Bloquear domínios personalizados" }
        val exportSettings = Button(this).apply { text = "Copiar backup das preferências" }
        val importSettings = Button(this).apply { text = "Importar backup" }
        val connected = prefs.getBoolean("google_connected", false)
        val googleSync = Button(this).apply { text = if (connected) "Sincronizar agora com Google Drive" else "Conectar Google e sincronizar" }
        panel.addView(editAllow)
        panel.addView(editBlock)
        panel.addView(exportSettings)
        panel.addView(importSettings)
        panel.addView(googleSync)
        if (connected) {
            panel.addView(TextView(this).apply {
                val lastSync = prefs.getLong("google_last_sync", 0L)
                text = if (lastSync == 0L) "Google Drive conectado." else "Google Drive conectado · última sincronização ${java.text.DateFormat.getDateTimeInstance().format(java.util.Date(lastSync))}."
                textSize = 12f; setTextColor(Color.GRAY); setPadding(4, 4, 4, 8)
            })
            val disconnect = Button(this).apply { text = "Desconectar Google" }
            panel.addView(disconnect)
            disconnect.setOnClickListener { dialogDisconnectGoogle() }
        }
        val explanation = TextView(this).apply {
            text = if (injectionSupported) "Camuflagem, compatibilidade, proteção contra pop-ups, encurtadores e limpeza visual do perfil Reforçado rodam no início das páginas." else "Este WebView do Android não oferece o recurso de scripts no início da página. A camuflagem e os atalhos não estão ativos; o bloqueio de rede continua funcionando."
            textSize = 12f
            setTextColor(Color.GRAY)
            setPadding(0, 12, 0, 0)
        }
        panel.addView(explanation)
        val licenses = Button(this).apply { text = "Licenças e fontes" }
        panel.addView(licenses)

        val scrollPanel = ScrollView(this).apply { addView(panel) }
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("AdVeil · ${blocker.totalBlocked} bloqueios")
            .setView(scrollPanel)
            .setPositiveButton("Concluir", null)
            .create()
        protection.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean("enabled", checked).apply()
            touchSettings()
            syncBlocker(); configureAllPageProtections(); currentView()?.reload(); refreshStatus()
        }
        profileGroup.setOnCheckedChangeListener { _, checkedId ->
            prefs.edit().putString("profile", when (checkedId) { strong.id -> "strong"; companion.id -> "companion"; else -> "balanced" }).apply()
            touchSettings()
            syncBlocker()
            configureAllPageProtections()
            currentView()?.reload()
        }
        pageProtection.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean("page_protection", checked).apply()
            touchSettings()
            syncBlocker(); configureAllPageProtections(); currentView()?.reload()
        }
        shorteners.setOnCheckedChangeListener { _, checked ->
            prefs.edit().putBoolean("shorteners", checked).apply()
            touchSettings()
            configureAllPageProtections(); currentView()?.reload()
        }
        editAllow.setOnClickListener { editDomainList("Permitir domínios", "allow_domains") }
        editBlock.setOnClickListener { editDomainList("Bloquear domínios personalizados", "block_domains") }
        exportSettings.setOnClickListener { exportPreferences() }
        importSettings.setOnClickListener { dialog.dismiss(); importPreferences() }
        googleSync.setOnClickListener { dialog.dismiss(); requestGoogleAuthorization(showErrors = true) }
        pause.setOnClickListener {
            if (site != null) {
                if (isPaused) disabled.remove(site) else disabled.add(site)
                prefs.edit().putStringSet("disabled_hosts", disabled).apply()
                touchSettings()
                syncBlocker(); configureAllPageProtections(); currentView()?.reload(); dialog.dismiss(); showAdVeilSettings()
            }
        }
        licenses.setOnClickListener { dialog.dismiss(); showLicenses() }
        dialog.show()
    }

    private fun showLicenses() {
        val text = assets.open("OPEN_SOURCE_LICENSES.txt").bufferedReader().use { it.readText() }
        val content = TextView(this).apply { this.text = text; textSize = 12f; setPadding(20, 16, 20, 16) }
        val scroll = ScrollView(this).apply { addView(content) }
        android.app.AlertDialog.Builder(this)
            .setTitle("Licenças e fontes")
            .setView(scroll)
            .setPositiveButton("Fechar", null)
            .show()
    }

    private fun showLibrary() {
        val options = arrayOf("Favoritos", "Histórico", "Salvar grupo de abas", "Grupos de abas salvas")
        android.app.AlertDialog.Builder(this)
            .setTitle("Biblioteca do navegador")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> showBookmarks()
                    1 -> showHistory()
                    2 -> saveCurrentTabGroup()
                    3 -> showSavedTabGroups()
                }
            }
            .show()
    }

    private fun toggleCurrentBookmark() {
        val view = currentView() ?: return
        val url = view.url.orEmpty()
        val title = tabs.getOrNull(selectedTab)?.title?.takeIf(String::isNotBlank) ?: url
        if (url.isBlank()) return
        val added = dataStore.toggleBookmark(url, title)
        android.widget.Toast.makeText(this, if (added) "Adicionado aos favoritos." else "Removido dos favoritos.", android.widget.Toast.LENGTH_SHORT).show()
        scheduleGoogleSync()
    }

    private fun showBookmarks() {
        val entries = dataStore.bookmarks()
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(12, 8, 12, 8) }
        if (entries.isEmpty()) list.addView(TextView(this).apply { text = "Ainda não há favoritos salvos."; setPadding(8, 12, 8, 12) })
        entries.forEach { item ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            val label = TextView(this).apply {
                text = "${item.title.ifBlank { item.url }}\n${item.url}"
                setPadding(8, 10, 8, 10); setTextColor(Color.DKGRAY)
                setOnClickListener { navigate(item.url) }
            }
            row.addView(label, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(button("×", 42) {
                dataStore.deleteBookmark(item.url); list.removeView(row); scheduleGoogleSync()
            })
            list.addView(row)
        }
        android.app.AlertDialog.Builder(this)
            .setTitle("Favoritos")
            .setView(ScrollView(this).apply { addView(list) })
            .setPositiveButton("Fechar", null)
            .show()
    }

    private fun showHistory() {
        val entries = dataStore.recentHistory()
        val labels = entries.map { (title, url) -> "${title.ifBlank { url }}\n$url" }.toTypedArray()
        val dialog = android.app.AlertDialog.Builder(this)
            .setTitle("Histórico recente")
            .setItems(labels) { _, which -> entries.getOrNull(which)?.second?.let(::navigate) }
            .setPositiveButton("Fechar", null)
        if (entries.isEmpty()) dialog.setMessage("O histórico de navegação aparecerá aqui.")
        else dialog.setNeutralButton("Limpar histórico") { _, _ ->
            dataStore.clearHistory()
            scheduleGoogleSync()
            android.widget.Toast.makeText(this, "Histórico apagado deste navegador.", android.widget.Toast.LENGTH_SHORT).show()
        }
        dialog.show()
    }

    private fun saveCurrentTabGroup() {
        val urls = tabs.mapNotNull { tab -> tab.view.url?.takeIf(::isHttpUrl) }.distinct().take(100)
        if (urls.isEmpty()) {
            android.widget.Toast.makeText(this, "Não há páginas abertas para salvar.", android.widget.Toast.LENGTH_SHORT).show()
            return
        }
        val name = EditText(this).apply { setText("Meu grupo de abas"); isSingleLine = true }
        android.app.AlertDialog.Builder(this)
            .setTitle("Salvar ${urls.size} abas")
            .setView(name)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Salvar") { _, _ ->
                dataStore.saveTabGroup(name.text.toString(), urls)
                scheduleGoogleSync()
                android.widget.Toast.makeText(this, "Grupo de abas salvo.", android.widget.Toast.LENGTH_SHORT).show()
            }
            .show()
    }

    private fun showSavedTabGroups() {
        val entries = dataStore.savedTabGroups()
        val list = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(12, 8, 12, 8) }
        if (entries.isEmpty()) list.addView(TextView(this).apply { text = "Nenhum grupo de abas salvo."; setPadding(8, 12, 8, 12) })
        entries.forEach { group ->
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
            val label = TextView(this).apply {
                text = "${group.name}\n${group.urls.size} abas"
                setPadding(8, 10, 8, 10); setTextColor(Color.DKGRAY)
            }
            row.addView(label, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f))
            row.addView(button("Abrir", 56) {
                group.urls.firstOrNull()?.let { currentView()?.loadUrl(it) }
                group.urls.drop(1).forEach(::newTab)
            })
            row.addView(button("×", 42) {
                dataStore.deleteSavedGroup(group.id); list.removeView(row); scheduleGoogleSync()
            })
            list.addView(row)
        }
        android.app.AlertDialog.Builder(this)
            .setTitle("Grupos de abas salvas")
            .setView(ScrollView(this).apply { addView(list) })
            .setPositiveButton("Fechar", null)
            .show()
    }

    private fun isHttpUrl(value: String): Boolean = runCatching {
        val uri = android.net.Uri.parse(value)
        uri.scheme in setOf("http", "https") && !uri.host.isNullOrBlank() && uri.userInfo.isNullOrEmpty()
    }.getOrDefault(false)

    private fun touchSettings() {
        prefs.edit().putLong("settings_updated_at", System.currentTimeMillis()).apply()
        scheduleGoogleSync()
    }

    private fun scheduleGoogleSync() {
        if (!prefs.getBoolean("google_connected", false) || isFinishing) return
        syncHandler.removeCallbacks(syncRequest)
        syncHandler.postDelayed(syncRequest, 4_000)
    }

    private fun requestGoogleAuthorization(showErrors: Boolean) {
        if (googleSyncInProgress) return
        val request = AuthorizationRequest.builder().setRequestedScopes(listOf(DRIVE_APPDATA_SCOPE)).build()
        Identity.getAuthorizationClient(this).authorize(request)
            .addOnSuccessListener { result ->
                if (result.hasResolution()) {
                    if (!showErrors) return@addOnSuccessListener
                    val pending = result.pendingIntent
                    if (pending == null) {
                        if (showErrors) showGoogleMessage("O Google não disponibilizou a tela de autorização.")
                        return@addOnSuccessListener
                    }
                    try {
                        startIntentSenderForResult(pending.intentSender, GOOGLE_AUTH_REQUEST, null, 0, 0, 0)
                    } catch (_: IntentSender.SendIntentException) {
                        if (showErrors) showGoogleMessage("Não foi possível abrir a autorização do Google.")
                    }
                } else {
                    val token = result.accessToken
                    if (token.isNullOrBlank()) {
                        if (showErrors) showGoogleMessage("O Google não retornou autorização para o Drive.")
                    } else performGoogleSync(token)
                }
            }
            .addOnFailureListener { error ->
                if (showErrors) showGoogleMessage("Falha ao conectar ao Google: ${error.message ?: "tente novamente"}")
            }
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != GOOGLE_AUTH_REQUEST) return
        if (resultCode != RESULT_OK || data == null) {
            showGoogleMessage("Conexão com o Google cancelada.")
            return
        }
        val authorization = runCatching { Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(data) }.getOrElse {
            showGoogleMessage("Não foi possível concluir a autorização do Google.")
            return
        }
        val token = authorization.accessToken
        if (token.isNullOrBlank()) showGoogleMessage("O Google não retornou autorização para o Drive.")
        else performGoogleSync(token)
    }

    private fun performGoogleSync(accessToken: String) {
        if (googleSyncInProgress) return
        googleSyncInProgress = true
        showGoogleMessage("Sincronizando favoritos, histórico e abas salvas…")
        Thread {
            try {
                GoogleDriveSync.synchronize(accessToken) { remote ->
                    val localSettingsAt = prefs.getLong("settings_updated_at", 0L)
                    val merge = dataStore.mergeRemote(remote, preferencesJson(), localSettingsAt)
                    if (merge.settingsChanged) applyPreferencesJson(merge.settings, merge.settingsUpdatedAt)
                    if (remote == null && localSettingsAt == 0L) {
                        prefs.edit().putLong("settings_updated_at", System.currentTimeMillis()).apply()
                    }
                    dataStore.snapshot(preferencesJson(), prefs.getLong("settings_updated_at", 0L))
                }
                prefs.edit().putBoolean("google_connected", true).putLong("google_last_sync", System.currentTimeMillis()).apply()
                runOnUiThread {
                    googleSyncInProgress = false
                    syncBlocker(); configureAllPageProtections(); currentView()?.reload(); refreshStatus()
                    showGoogleMessage("Sincronização concluída com Google Drive.")
                }
            } catch (error: Exception) {
                runOnUiThread {
                    googleSyncInProgress = false
                    showGoogleMessage("Falha na sincronização: ${error.message ?: "verifique a conexão e tente novamente"}")
                }
            }
        }.start()
    }

    private fun dialogDisconnectGoogle() {
        android.app.AlertDialog.Builder(this)
            .setTitle("Desconectar Google")
            .setMessage("O app deixará de sincronizar. O backup já salvo no Drive será mantido.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Desconectar") { _, _ ->
                val request = RevokeAccessRequest.builder().setScopes(listOf(DRIVE_APPDATA_SCOPE)).build()
                Identity.getAuthorizationClient(this).revokeAccess(request)
                    .addOnSuccessListener {
                        prefs.edit().putBoolean("google_connected", false).apply()
                        syncHandler.removeCallbacks(syncRequest)
                        showGoogleMessage("Conta Google desconectada.")
                    }
                    .addOnFailureListener { showGoogleMessage("Não foi possível desconectar a conta Google.") }
            }
            .show()
    }

    private fun showGoogleMessage(message: String) {
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show()
    }

    private fun editDomainList(title: String, preferenceKey: String) {
        val existing = prefs.getStringSet(preferenceKey, emptySet()).orEmpty().sorted().joinToString("\n")
        val input = EditText(this).apply {
            setText(existing); minLines = 5; maxLines = 10; gravity = Gravity.TOP
            hint = "exemplo.com\noutro.exemplo.org"
        }
        android.app.AlertDialog.Builder(this)
            .setTitle(title)
            .setMessage("Um domínio por linha, sem esquema ou caminho (máximo de 200).")
            .setView(input)
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Salvar") { _, _ ->
                val domains = runCatching { normalizeDomains(input.text.toString()) }.getOrNull()
                if (domains == null || domains.size > 200) {
                    android.widget.Toast.makeText(this, "Domínio inválido ou limite de 200 entradas excedido.", android.widget.Toast.LENGTH_LONG).show()
                } else {
                    val otherKey = if (preferenceKey == "allow_domains") "block_domains" else "allow_domains"
                    val other = prefs.getStringSet(otherKey, emptySet()).orEmpty()
                    if (domains.any { it in other }) {
                        android.widget.Toast.makeText(this, "Um domínio não pode estar nas duas listas.", android.widget.Toast.LENGTH_LONG).show()
                    } else {
                        prefs.edit().putStringSet(preferenceKey, domains).apply()
                        touchSettings()
                        syncBlocker(); currentView()?.reload()
                    }
                }
            }
            .show()
    }

    private fun normalizeDomains(value: String): Set<String> = value.lineSequence()
        .map(String::trim).filter(String::isNotEmpty).map { entry ->
            require(!entry.contains(Regex("[\\s/:?#@*\\\\]")))
            val host = android.net.Uri.parse("https://${entry.removeSuffix(".")}").host?.lowercase(Locale.ROOT)
            require(host != null && host.length <= 253 && host.split('.').all { it.matches(Regex("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?")) })
            host
        }.toSet()

    private fun exportPreferences() {
        val settings = preferencesJson()
        val clipboard = getSystemService(ClipboardManager::class.java)
        clipboard.setPrimaryClip(ClipData.newPlainText("AdVeil Browser", settings.toString(2)))
        android.widget.Toast.makeText(this, "Backup JSON copiado para a área de transferência.", android.widget.Toast.LENGTH_LONG).show()
    }

    private fun preferencesJson() = JSONObject()
            .put("schema", 1)
            .put("enabled", prefs.getBoolean("enabled", true))
            .put("profile", prefs.getString("profile", "balanced"))
            .put("pageProtection", prefs.getBoolean("page_protection", true))
            .put("shorteners", prefs.getBoolean("shorteners", true))
            .put("disabledHosts", JSONArray(prefs.getStringSet("disabled_hosts", emptySet()).orEmpty().sorted()))
            .put("allowDomains", JSONArray(prefs.getStringSet("allow_domains", emptySet()).orEmpty().sorted()))
            .put("blockDomains", JSONArray(prefs.getStringSet("block_domains", emptySet()).orEmpty().sorted()))

    private fun applyPreferencesJson(json: JSONObject, updatedAt: Long) {
        require(json.optInt("schema", 1) == 1)
        fun boolean(key: String, fallback: Boolean) = if (!json.has(key)) fallback else json.get(key) as? Boolean ?: error("Valor inválido: $key")
        fun domains(key: String): Set<String> {
            val array = json.optJSONArray(key) ?: return emptySet()
            require(array.length() <= 200)
            return normalizeDomains((0 until array.length()).joinToString("\n") { array.getString(it) })
        }
        val profile = json.optString("profile", "balanced")
        require(profile in setOf("balanced", "strong", "companion"))
        val disabled = domains("disabledHosts")
        val allowed = domains("allowDomains")
        val blocked = domains("blockDomains")
        require(allowed.intersect(blocked).isEmpty())
        prefs.edit()
            .putBoolean("enabled", boolean("enabled", true))
            .putString("profile", profile)
            .putBoolean("page_protection", boolean("pageProtection", true))
            .putBoolean("shorteners", boolean("shorteners", true))
            .putStringSet("disabled_hosts", disabled)
            .putStringSet("allow_domains", allowed)
            .putStringSet("block_domains", blocked)
            .putLong("settings_updated_at", updatedAt)
            .apply()
    }

    private fun importPreferences() {
        val input = EditText(this).apply { minLines = 8; maxLines = 14; gravity = Gravity.TOP; hint = "Cole aqui o backup JSON" }
        android.app.AlertDialog.Builder(this)
            .setTitle("Importar preferências")
            .setView(ScrollView(this).apply { addView(input) })
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Importar") { _, _ ->
                val imported = runCatching { applyPreferencesJson(JSONObject(input.text.toString()), System.currentTimeMillis()) }.isSuccess
                if (imported) {
                    syncBlocker(); configureAllPageProtections(); currentView()?.reload(); refreshStatus(); scheduleGoogleSync()
                    android.widget.Toast.makeText(this, "Preferências importadas.", android.widget.Toast.LENGTH_SHORT).show()
                } else android.widget.Toast.makeText(this, "Backup inválido. Nada foi alterado.", android.widget.Toast.LENGTH_LONG).show()
            }
            .show()
    }

    private fun configureAllPageProtections() = tabs.forEach { tab ->
        runCatching { configurePageProtection(tab) }
            .onFailure { Log.w("AdVeil", "Não foi possível atualizar a proteção da página", it) }
    }

    private fun configurePageProtection(tab: BrowserTab) {
        tab.scriptHandlers.forEach { runCatching { it.remove() } }
        tab.scriptHandlers.clear()
        val web = tab.view
        if (!injectionSupported || !prefs.getBoolean("enabled", true)) return
        val disabledHosts = prefs.getStringSet("disabled_hosts", emptySet()).orEmpty()
        val paused = JSONArray(disabledHosts).toString()
        val gate = """(()=>{const h=location.hostname.toLowerCase();const d=$paused;if(d.some(x=>h===x||h.endsWith('.'+x)))return;"""
        val tail = "})();"
        val world = runCatching { WebViewCompat.getExecutionWorld(web, JavaScriptExecutionWorld.PAGE_WORLD_NAME) }
            .getOrElse {
                Log.w("AdVeil", "WebView sem suporte ao ambiente de scripts de página", it)
                return
            }
        fun register(script: String) {
            runCatching {
                tab.scriptHandlers += WebViewCompat.addJavaScriptOnEvent(
                    web, script, WebViewCompat.INJECTION_EVENT_DOCUMENT_START,
                    setOf("http://*", "https://*"), world,
                )
            }
        }
        if (prefs.getBoolean("page_protection", true)) {
            val files = listOf("compat.js", "detectors.js", "shield.js", "popups.js")
            val core = files.joinToString("\n") { assets.open("adveil/$it").bufferedReader().use { input -> input.readText() } }
            register("$gate\n$core\n$tail")
        }
        if (prefs.getBoolean("shorteners", true)) {
            runCatching { WebViewCompat.addWebMessageListener(web, "AdVeilNativeBridge", SHORTENER_ORIGINS, onShortenerMessage(tab)) }
            val source = assets.open("adveil/shorteners.js").bufferedReader().use { it.readText() }
            register("$gate\n$source\n$tail")
        }
        if (prefs.getString("profile", "balanced") == "strong" && prefs.getBoolean("page_protection", true)) {
            val css = assets.open("adveil/cosmetic.css").bufferedReader().use { it.readText() }
            val serializedCss = JSONArray().put(css).toString().drop(1).dropLast(1)
            register("$gate try{const s=new CSSStyleSheet();s.replaceSync($serializedCss);document.adoptedStyleSheets=[...document.adoptedStyleSheets,s]}catch{} $tail")
        }
    }

    private fun onShortenerMessage(tab: BrowserTab) = WebViewCompat.WebMessageListener { view, message: WebMessageCompat, sourceOrigin, isMainFrame, replyProxy ->
        val request = runCatching { JSONObject(message.data.orEmpty()) }.getOrNull()
        val requestId = request?.optString("requestId").orEmpty()
        val allowed = runCatching {
            if (request == null || !isMainFrame || view !== tab.view || !prefs.getBoolean("enabled", true) || !prefs.getBoolean("shorteners", true)) return@runCatching false
            val sourceHost = sourceOrigin.host?.lowercase(Locale.ROOT) ?: return@runCatching false
            if (sourceHost !in SHORTENER_HOSTS || currentHostFor(view) != sourceHost) return@runCatching false
            if (prefs.getStringSet("disabled_hosts", emptySet()).orEmpty().any { hostMatches(sourceHost, it) }) return@runCatching false
            if (tab.shortenerExpiry < System.currentTimeMillis() || tab.shortenerCode.isNullOrEmpty()) return@runCatching false
            val code = request.optString("code")
            if (code != tab.shortenerCode || !code.matches(Regex("[a-zA-Z0-9_-]{1,64}"))) return@runCatching false
            val method = request.optString("method").uppercase(Locale.ROOT)
            if (method !in setOf("GET", "POST")) return@runCatching false
            val destination = android.net.Uri.parse(request.optString("destination"))
            if (destination.scheme !in setOf("http", "https") || !destination.userInfo.isNullOrEmpty()) return@runCatching false
            val selfPost = method == "POST" && destination.toString() == view.url && destination.host == sourceHost
            val nextHop = sourceHost == "tech8s.net" && destination.host == "game5s.com" && destination.path == "/safe2.php" && !destination.getQueryParameter("link").isNullOrEmpty()
                || sourceHost == "game5s.com" && destination.host == "droplink.co" && destination.path.orEmpty().matches(Regex("/[a-zA-Z0-9_-]{1,64}"))
            if (!selfPost && !nextHop) return@runCatching false
            val step = "$sourceHost\n$method\n${destination}"
            if (tab.shortenerSteps.contains(step) || tab.shortenerSteps.size >= 6) return@runCatching false
            tab.shortenerSteps += step
            true
        }.getOrDefault(false)
        runCatching { replyProxy.postMessage(JSONObject().put("requestId", requestId).put("ok", true).put("allowed", allowed).toString()) }
    }

    private fun observeShortenerNavigation(tab: BrowserTab, url: String) {
        val uri = android.net.Uri.parse(url)
        val host = uri.host?.lowercase(Locale.ROOT) ?: return
        val code = when {
            host in setOf("droplink.co", "ez4short.com") && uri.path.orEmpty().matches(Regex("/[a-zA-Z0-9_-]{1,64}")) -> uri.path!!.drop(1)
            host in SHORTENER_HOSTS && uri.path.orEmpty().matches(Regex("/safe2?\\.php")) -> uri.getQueryParameter("link")
            else -> null
        }
        if (!code.isNullOrEmpty() && code.matches(Regex("[a-zA-Z0-9_-]{1,64}"))) {
            tab.shortenerCode = code
            tab.shortenerExpiry = System.currentTimeMillis() + 600_000
            tab.shortenerSteps.clear()
        } else if (host !in SHORTENER_CHAIN_HOSTS) {
            tab.shortenerCode = null
            tab.shortenerSteps.clear()
        }
    }

    private fun currentHostFor(view: WebView) = android.net.Uri.parse(view.url.orEmpty()).host?.lowercase(Locale.ROOT)
    private fun hostMatches(host: String, domain: String) = host == domain || host.endsWith(".$domain")

    private fun syncBlocker() {
        blocker.configure(
            prefs.getString("profile", "balanced") ?: "balanced",
            prefs.getBoolean("enabled", true),
            prefs.getBoolean("page_protection", true),
            prefs.getStringSet("disabled_hosts", emptySet()).orEmpty(),
            prefs.getStringSet("allow_domains", emptySet()).orEmpty(),
            prefs.getStringSet("block_domains", emptySet()).orEmpty(),
        )
    }

    private fun currentHost(): String? = runCatching { android.net.Uri.parse(currentView()?.url).host?.lowercase(Locale.ROOT) }.getOrNull()
    private fun currentView(): WebView? = tabs.getOrNull(selectedTab)?.view
    private fun refreshStatus() {
        if (!::status.isInitialized) return
        val enabled = prefs.getBoolean("enabled", true)
        val profile = when (prefs.getString("profile", "balanced")) { "strong" -> "Reforçado"; "companion" -> "Complemento"; else -> "Equilibrado" }
        status.text = "${if (enabled) "●" else "○"} AdVeil $profile · ${blocker.totalBlocked} bloqueios"
    }

    private fun navigate(input: String) {
        val value = input.trim()
        if (value.isEmpty()) return
        val url = if (value.contains(' ') || (!value.contains("://") && !value.contains('.'))) {
            "https://www.google.com/search?q=" + URLEncoder.encode(value, "UTF-8")
        } else if (value.contains("://")) value else "https://$value"
        currentView()?.loadUrl(url)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        val view = currentView()
        if (view?.canGoBack() == true) view.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        syncHandler.removeCallbacks(syncRequest)
        tabs.forEach { tab ->
            tab.scriptHandlers.forEach { runCatching { it.remove() } }
            runCatching { tab.view.stopLoading() }
            runCatching { tab.view.destroy() }
        }
        tabs.clear()
        if (::dataStore.isInitialized) runCatching { dataStore.close() }
        super.onDestroy()
    }

    companion object {
        private const val GOOGLE_AUTH_REQUEST = 8172
        private val DRIVE_APPDATA_SCOPE = Scope("https://www.googleapis.com/auth/drive.appdata")
        private val SHORTENER_HOSTS = setOf("tech8s.net", "game5s.com")
        private val SHORTENER_CHAIN_HOSTS = setOf("droplink.co", "ez4short.com", "tech8s.net", "game5s.com", "www.google.com", "www.bing.com")
        private val SHORTENER_ORIGINS = setOf(
            "https://tech8s.net", "https://*.tech8s.net", "https://game5s.com", "https://*.game5s.com",
            "http://tech8s.net", "http://*.tech8s.net", "http://game5s.com", "http://*.game5s.com",
        )
    }
}
