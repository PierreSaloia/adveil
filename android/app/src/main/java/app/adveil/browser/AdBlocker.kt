package app.adveil.browser

import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import org.json.JSONArray
import java.io.ByteArrayInputStream
import java.net.URI
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/** Small native matcher for the network rules exported from the AdVeil DNR lists. */
class AdBlocker(private val context: Context) {
    private data class Rule(
        val action: String,
        val priority: Int,
        val filter: String?,
        val filterDomain: String?,
        val requestDomains: List<String>,
        val excludedRequestDomains: List<String>,
        val initiatorDomains: List<String>,
        val excludedInitiatorDomains: List<String>,
        val domainType: String?,
        val resourceTypes: List<String>,
        val excludedResourceTypes: List<String>,
    )

    private val blockedCount = AtomicInteger(0)
    private val filterRegexes = ConcurrentHashMap<String, Regex>()
    val totalBlocked: Int get() = blockedCount.get()
    @Volatile private var activeProfile = ""
    @Volatile private var enabled = true
    @Volatile private var camouflageEnabled = true
    @Volatile private var pausedHosts: Set<String> = emptySet()
    @Volatile private var customBlockDomains: Set<String> = emptySet()
    @Volatile private var customAllowDomains: Set<String> = emptySet()
    @Volatile private var rules: List<Rule> = emptyList()
    @Volatile private var genericRules: List<Rule> = emptyList()
    @Volatile private var rulesByDomain: Map<String, List<Rule>> = emptyMap()
    private val adDomains = JSONArray(context.assets.open("adveil-ad-domains.json").bufferedReader().use { it.readText() })
        .let { array -> (0 until array.length()).map { array.getString(it) } }
    private val sitePacks = JSONArray(context.assets.open("adveil-site-packs.json").bufferedReader().use { it.readText() })
        .let { array -> (0 until array.length()).map { i ->
            val item = array.getJSONObject(i)
            item.getString("host") to item.getJSONArray("allowThirdParty").let { allowed -> (0 until allowed.length()).map { allowed.getString(it) } }
        } }

    init { setProfile("balanced") }

    fun configure(profile: String, protectionEnabled: Boolean, camouflageEnabled: Boolean, disabledHosts: Set<String>, allowDomains: Set<String>, blockDomains: Set<String>) {
        enabled = protectionEnabled
        this.camouflageEnabled = camouflageEnabled
        pausedHosts = disabledHosts
        customAllowDomains = allowDomains
        customBlockDomains = blockDomains
        setProfile(profile)
    }

    private fun setProfile(profile: String) {
        val normalized = if (profile == "strong" || profile == "companion") profile else "balanced"
        if (normalized == activeProfile) return
        if (normalized == "companion") {
            rules = emptyList(); genericRules = emptyList(); rulesByDomain = emptyMap()
            activeProfile = normalized
            return
        }
        val asset = "adveil-rules-$normalized.json"
        rules = JSONArray(context.assets.open(asset).bufferedReader().use { it.readText() }).let { array ->
            (0 until array.length()).map { i ->
                val item = array.getJSONObject(i)
                val condition = item.getJSONObject("condition")
                fun strings(key: String) = condition.optJSONArray(key).toList()
                val filter = condition.optString("urlFilter").takeIf { it.isNotEmpty() }
                Rule(
                    action = item.getJSONObject("action").optString("type", "block"),
                    priority = item.optInt("priority", 1),
                    filter = filter,
                    filterDomain = filter?.takeIf { it.startsWith("||") }?.drop(2)?.takeWhile { it !in "/^*?|" }?.takeIf { it.isNotEmpty() },
                    requestDomains = strings("requestDomains"),
                    excludedRequestDomains = strings("excludedRequestDomains"),
                    initiatorDomains = strings("initiatorDomains"),
                    excludedInitiatorDomains = strings("excludedInitiatorDomains"),
                    domainType = condition.optString("domainType").takeIf { it.isNotEmpty() },
                    resourceTypes = strings("resourceTypes"),
                    excludedResourceTypes = strings("excludedResourceTypes"),
                )
            }
        }
        val index = HashMap<String, MutableList<Rule>>()
        val generic = mutableListOf<Rule>()
        rules.forEach { rule ->
            val keys = if (rule.requestDomains.isNotEmpty()) rule.requestDomains else listOfNotNull(rule.filterDomain)
            if (keys.isEmpty()) generic.add(rule) else keys.forEach { key -> index.getOrPut(key) { mutableListOf() }.add(rule) }
        }
        genericRules = generic
        rulesByDomain = index
        activeProfile = normalized
    }

    fun intercept(request: WebResourceRequest, pageUrl: String?): WebResourceResponse? {
        if (request.isForMainFrame || request.method !in setOf("GET", "HEAD")) return null
        val url = request.url.toString()
        val host = request.url.host?.lowercase(Locale.ROOT) ?: return null
        val pageHost = runCatching { URI(pageUrl).host?.lowercase(Locale.ROOT) }.getOrNull()
        if (!enabled || pageHost?.let { page -> pausedHosts.any { domainMatches(page, it) } } == true) return null
        if (customAllowDomains.any { domainMatches(host, it) }) return null
        if (customBlockDomains.any { domainMatches(host, it) }) {
            blockedCount.incrementAndGet()
            return WebResourceResponse("text/plain", "UTF-8", 204, "No Content", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }
        val resourcePath = request.url.path.orEmpty().lowercase(Locale.ROOT)
        val type = when {
            request.requestHeaders["Accept"]?.contains("image", true) == true -> "image"
            request.requestHeaders["Accept"]?.contains("font", true) == true -> "font"
            request.requestHeaders["Accept"]?.contains("text/css", true) == true -> "stylesheet"
            request.requestHeaders["Accept"]?.contains("javascript", true) == true -> "script"
            request.requestHeaders["Accept"]?.contains("text/html", true) == true -> "sub_frame"
            request.requestHeaders["Accept"]?.contains("video", true) == true || request.requestHeaders["Accept"]?.contains("audio", true) == true -> "media"
            resourcePath.endsWith(".css") -> "stylesheet"
            resourcePath.endsWith(".js") || resourcePath.endsWith(".mjs") -> "script"
            resourcePath.endsWith(".woff") || resourcePath.endsWith(".woff2") || resourcePath.endsWith(".ttf") || resourcePath.endsWith(".otf") -> "font"
            resourcePath.endsWith(".png") || resourcePath.endsWith(".jpg") || resourcePath.endsWith(".jpeg") || resourcePath.endsWith(".gif") || resourcePath.endsWith(".webp") || resourcePath.endsWith(".svg") || resourcePath.endsWith(".ico") -> "image"
            resourcePath.endsWith(".mp4") || resourcePath.endsWith(".webm") || resourcePath.endsWith(".mp3") || resourcePath.endsWith(".m4a") || resourcePath.endsWith(".ogg") -> "media"
            else -> "xmlhttprequest"
        }
        val candidates = LinkedHashSet<Rule>(genericRules)
        val labels = host.split('.')
        for (i in labels.indices) rulesByDomain[labels.drop(i).joinToString(".")]?.let(candidates::addAll)
        val match = candidates.asSequence()
            .filter { it.initiatorDomains.isEmpty() || it.initiatorDomains.any { d -> domainMatches(pageHost, d) } }
            .filter { it.excludedInitiatorDomains.none { d -> domainMatches(pageHost, d) } }
            .filter { it.requestDomains.isEmpty() || it.requestDomains.any { d -> domainMatches(host, d) } }
            .filter { it.excludedRequestDomains.none { d -> domainMatches(host, d) } }
            .filter { it.domainType == null || (it.domainType == "firstParty") == (pageHost != null && domainMatches(host, pageHost)) }
            .filter { it.resourceTypes.isEmpty() || it.resourceTypes.any { t -> resourceTypeMatches(t, type) } }
            .filter { it.excludedResourceTypes.none { t -> resourceTypeMatches(t, type) } }
            .filter { rule -> rule.filter?.let { filterRegexes.computeIfAbsent(it) { filter -> compileUrlFilter(filter) }.containsMatchIn(url) } ?: true }
            .maxByOrNull { it.priority }
        if (match?.action == "allow") return null
        val standIn = standInFor(host, request.url.path.orEmpty(), type)
        val sitePackBlock = activeProfile != "companion" && sitePacks.any { (site, allowed) ->
            pageHost?.let { domainMatches(it, site) } == true && !domainMatches(host, site) && allowed.none { domainMatches(host, it) }
        }
        val standInPriority = when (standIn) {
            "adsbygoogle.js", "googletag.js", "ad-status.js", "flags.js" -> 20
            null -> 0
            else -> 15
        }
        if (standIn != null && camouflageEnabled && activeProfile != "companion" && (!sitePackBlock || standInPriority > 18)) {
            blockedCount.incrementAndGet()
            val mime = when {
                standIn.endsWith(".js") -> "application/javascript"
                standIn.endsWith(".html") -> "text/html"
                standIn.endsWith(".gif") -> "image/gif"
                standIn.endsWith(".png") -> "image/png"
                else -> "application/octet-stream"
            }
            val encoding = if (mime.startsWith("image/")) null else "UTF-8"
            return WebResourceResponse(mime, encoding, context.assets.open("stubs/$standIn"))
        }
        if (sitePackBlock || match?.action == "block") {
            blockedCount.incrementAndGet()
            return WebResourceResponse("text/plain", "UTF-8", 204, "No Content", emptyMap(), ByteArrayInputStream(ByteArray(0)))
        }
        return null
    }

    private fun standInFor(host: String, path: String, type: String): String? {
        val adHost = adDomains.any { domainMatches(host, it) }
        return when {
            type == "script" && activeProfile != "companion" && domainMatches(host, "steamverde.net") && path == "/sys-analytics.js" -> "noop.js"
            type == "script" && domainMatches(host, "googlesyndication.com") && path == "/pagead/js/adsbygoogle.js" -> "adsbygoogle.js"
            type == "script" && (domainMatches(host, "googletagservices.com") || domainMatches(host, "doubleclick.net")) && path == "/tag/js/gpt.js" -> "googletag.js"
            type == "script" && domainMatches(host, "doubleclick.net") && path == "/instream/ad_status.js" -> "ad-status.js"
            type == "script" && Regex("/(?:ads|adframe|adverts?|ad-provider|prebid-ads|show_ads)\\.js$").containsMatchIn(path) -> "flags.js"
            type == "script" && adHost -> "noop.js"
            type == "image" && adHost && path.endsWith("/favicon.ico") -> "icon.png"
            type == "image" && adHost -> "pixel.gif"
            type == "sub_frame" && adHost -> "frame.html"
            else -> null
        }
    }

    private fun domainMatches(host: String?, domain: String) = host != null && (host == domain || host.endsWith(".$domain"))
    private fun resourceTypeMatches(ruleType: String, detected: String) = when (ruleType) {
        "other" -> detected == "xmlhttprequest"
        "sub_frame" -> detected == "sub_frame"
        else -> ruleType == detected
    }
    private fun compileUrlFilter(filter: String): Regex {
        val value = filter.lowercase(Locale.ROOT)
        val domainAnchor = value.startsWith("||")
        val body = if (domainAnchor) value.drop(2) else value.removePrefix("|").let { if (value.length > 1 && value.endsWith('|')) it.dropLast(1) else it }
        val pieces = body.map { ch -> when (ch) {
            '*' -> ".*"
            '^' -> "(?:[^a-zA-Z0-9_.%-]|$)"
            else -> Regex.escape(ch.toString())
        } }.joinToString("")
        val anchored = (if (domainAnchor || value.startsWith('|')) "^" else "") +
            (if (domainAnchor) "[a-z]+://(?:[^/]+\\.)?" else "") + pieces +
            (if (value.endsWith('|')) "$" else "")
        return Regex(anchored, RegexOption.IGNORE_CASE)
    }
    private fun JSONArray?.toList(): List<String> = this?.let { a -> (0 until a.length()).map { a.getString(it) } } ?: emptyList()
}
