package app.adveil.browser

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** Local browser data that belongs to this AdVeil installation and can be backed up. */
class BrowserDataStore(context: Context) : SQLiteOpenHelper(context, "adveil-browser-data.db", null, 1) {
    data class Bookmark(val url: String, val title: String, val updatedAt: Long)
    data class SavedTabGroup(val id: String, val name: String, val urls: List<String>, val updatedAt: Long)
    data class MergeResult(val settings: JSONObject, val settingsUpdatedAt: Long, val settingsChanged: Boolean)

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE visits (id TEXT PRIMARY KEY, url TEXT NOT NULL, title TEXT NOT NULL, visited_at INTEGER NOT NULL)")
        db.execSQL("CREATE INDEX visits_by_time ON visits(visited_at DESC)")
        db.execSQL("CREATE TABLE bookmarks (url TEXT PRIMARY KEY, title TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE saved_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, urls TEXT NOT NULL, updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL)")
        db.execSQL("CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

    fun recordVisit(url: String, title: String) {
        if (!isWebUrl(url)) return
        val db = writableDatabase
        db.insertWithOnConflict("visits", null, ContentValues().apply {
            put("id", UUID.randomUUID().toString())
            put("url", url.take(8192))
            put("title", title.take(1024))
            put("visited_at", System.currentTimeMillis())
        }, SQLiteDatabase.CONFLICT_IGNORE)
    }

    fun isBookmarked(url: String): Boolean = readableDatabase.rawQuery(
        "SELECT deleted FROM bookmarks WHERE url = ?", arrayOf(url),
    ).use { it.moveToFirst() && it.getInt(0) == 0 }

    fun toggleBookmark(url: String, title: String): Boolean {
        if (!isWebUrl(url)) return false
        val now = System.currentTimeMillis()
        val exists = isBookmarked(url)
        val previousCreated = readableDatabase.rawQuery("SELECT created_at FROM bookmarks WHERE url = ?", arrayOf(url)).use {
            if (it.moveToFirst()) it.getLong(0) else now
        }
        writableDatabase.insertWithOnConflict("bookmarks", null, ContentValues().apply {
            put("url", url.take(8192)); put("title", title.take(1024)); put("created_at", previousCreated)
            put("updated_at", now); put("deleted", if (exists) 1 else 0)
        }, SQLiteDatabase.CONFLICT_REPLACE)
        return !exists
    }

    fun bookmarks(): List<Bookmark> = readableDatabase.rawQuery(
        "SELECT url, title, updated_at FROM bookmarks WHERE deleted = 0 ORDER BY updated_at DESC", null,
    ).use { cursor ->
        buildList { while (cursor.moveToNext()) add(Bookmark(cursor.getString(0), cursor.getString(1), cursor.getLong(2))) }
    }

    fun saveTabGroup(name: String, urls: List<String>) {
        val safeUrls = urls.filter(::isWebUrl).distinct()
        if (safeUrls.isEmpty()) return
        val now = System.currentTimeMillis()
        writableDatabase.insertWithOnConflict("saved_groups", null, ContentValues().apply {
            put("id", UUID.randomUUID().toString()); put("name", name.trim().ifBlank { "Abas salvas" }.take(120))
            put("urls", JSONArray(safeUrls).toString()); put("updated_at", now); put("deleted", 0)
        }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun savedTabGroups(): List<SavedTabGroup> = readableDatabase.rawQuery(
        "SELECT id, name, urls, updated_at FROM saved_groups WHERE deleted = 0 ORDER BY updated_at DESC", null,
    ).use { cursor ->
        buildList {
            while (cursor.moveToNext()) {
                val urls = runCatching {
                    val array = JSONArray(cursor.getString(2))
                    (0 until array.length()).map { array.getString(it) }.filter(::isWebUrl)
                }.getOrDefault(emptyList())
                add(SavedTabGroup(cursor.getString(0), cursor.getString(1), urls, cursor.getLong(3)))
            }
        }
    }

    fun deleteBookmark(url: String) {
        val db = writableDatabase
        val values = ContentValues().apply { put("updated_at", System.currentTimeMillis()); put("deleted", 1) }
        db.update("bookmarks", values, "url = ?", arrayOf(url))
    }

    fun deleteSavedGroup(id: String) {
        writableDatabase.update("saved_groups", ContentValues().apply {
            put("updated_at", System.currentTimeMillis()); put("deleted", 1)
        }, "id = ?", arrayOf(id))
    }

    fun recentHistory(limit: Int = 500): List<Pair<String, String>> = readableDatabase.rawQuery(
        "SELECT title, url FROM visits ORDER BY visited_at DESC LIMIT ?", arrayOf(limit.coerceIn(1, 1000).toString()),
    ).use { cursor -> buildList { while (cursor.moveToNext()) add(cursor.getString(0) to cursor.getString(1)) } }

    fun clearHistory() {
        val now = System.currentTimeMillis()
        writableDatabase.delete("visits", null, null)
        setMetadata("history_clear_before", now.toString())
    }

    /** Merge append-only visits and timestamped bookmark/group records from another AdVeil install. */
    fun mergeRemote(remote: JSONObject?, localSettings: JSONObject, localSettingsUpdatedAt: Long): MergeResult {
        if (remote == null) return MergeResult(localSettings, localSettingsUpdatedAt, false)
        require(remote.optInt("schema") == 1) { "Formato de sincronização incompatível." }
        val db = writableDatabase
        val remoteClear = remote.optLong("historyClearBefore", 0L)
        val clearBefore = maxOf(metadataLong("history_clear_before"), remoteClear)
        if (clearBefore > 0) db.delete("visits", "visited_at <= ?", arrayOf(clearBefore.toString()))
        setMetadata("history_clear_before", clearBefore.toString())

        val history = remote.optJSONArray("history") ?: JSONArray()
        for (i in 0 until history.length()) {
            val item = history.optJSONObject(i) ?: continue
            val visitedAt = item.optLong("visitedAt")
            val url = item.optString("url")
            if (visitedAt <= clearBefore || !isWebUrl(url)) continue
            db.insertWithOnConflict("visits", null, ContentValues().apply {
                put("id", item.optString("id").takeIf(String::isNotBlank) ?: UUID.randomUUID().toString())
                put("url", url.take(8192)); put("title", item.optString("title").take(1024)); put("visited_at", visitedAt)
            }, SQLiteDatabase.CONFLICT_IGNORE)
        }
        val bookmarks = remote.optJSONArray("bookmarks") ?: JSONArray()
        for (i in 0 until bookmarks.length()) {
            val item = bookmarks.optJSONObject(i) ?: continue
            val url = item.optString("url")
            if (!isWebUrl(url)) continue
            val updatedAt = item.optLong("updatedAt")
            val localAt = db.rawQuery("SELECT updated_at FROM bookmarks WHERE url = ?", arrayOf(url)).use { if (it.moveToFirst()) it.getLong(0) else -1L }
            if (updatedAt > localAt) db.insertWithOnConflict("bookmarks", null, ContentValues().apply {
                put("url", url.take(8192)); put("title", item.optString("title").take(1024))
                put("created_at", item.optLong("createdAt", updatedAt)); put("updated_at", updatedAt)
                put("deleted", if (item.optBoolean("deleted")) 1 else 0)
            }, SQLiteDatabase.CONFLICT_REPLACE)
        }

        val groups = remote.optJSONArray("savedTabGroups") ?: JSONArray()
        for (i in 0 until groups.length()) {
            val item = groups.optJSONObject(i) ?: continue
            val id = item.optString("id")
            if (id.isBlank()) continue
            val updatedAt = item.optLong("updatedAt")
            val localAt = db.rawQuery("SELECT updated_at FROM saved_groups WHERE id = ?", arrayOf(id)).use { if (it.moveToFirst()) it.getLong(0) else -1L }
            if (updatedAt > localAt) {
                val urls = item.optJSONArray("urls") ?: JSONArray()
                val validUrls = JSONArray()
                for (j in 0 until urls.length()) urls.optString(j).takeIf(::isWebUrl)?.let(validUrls::put)
                db.insertWithOnConflict("saved_groups", null, ContentValues().apply {
                    put("id", id); put("name", item.optString("name", "Abas salvas").take(120))
                    put("urls", validUrls.toString()); put("updated_at", updatedAt)
                    put("deleted", if (item.optBoolean("deleted")) 1 else 0)
                }, SQLiteDatabase.CONFLICT_REPLACE)
            }
        }

        val remoteSettingsAt = remote.optLong("settingsUpdatedAt", 0L)
        val useRemoteSettings = remoteSettingsAt > localSettingsUpdatedAt
        val settings = if (useRemoteSettings) remote.optJSONObject("settings") ?: localSettings else localSettings
        return MergeResult(settings, if (useRemoteSettings) remoteSettingsAt else localSettingsUpdatedAt, useRemoteSettings)
    }

    fun snapshot(settings: JSONObject, settingsUpdatedAt: Long): JSONObject {
        val db = readableDatabase
        val history = JSONArray()
        db.rawQuery("SELECT id, url, title, visited_at FROM visits ORDER BY visited_at DESC", null).use { c ->
            while (c.moveToNext()) history.put(JSONObject().put("id", c.getString(0)).put("url", c.getString(1)).put("title", c.getString(2)).put("visitedAt", c.getLong(3)))
        }
        val bookmarks = JSONArray()
        db.rawQuery("SELECT url, title, created_at, updated_at, deleted FROM bookmarks ORDER BY updated_at DESC", null).use { c ->
            while (c.moveToNext()) bookmarks.put(JSONObject().put("url", c.getString(0)).put("title", c.getString(1)).put("createdAt", c.getLong(2)).put("updatedAt", c.getLong(3)).put("deleted", c.getInt(4) != 0))
        }
        val groups = JSONArray()
        db.rawQuery("SELECT id, name, urls, updated_at, deleted FROM saved_groups ORDER BY updated_at DESC", null).use { c ->
            while (c.moveToNext()) groups.put(JSONObject().put("id", c.getString(0)).put("name", c.getString(1)).put("urls", JSONArray(c.getString(2))).put("updatedAt", c.getLong(3)).put("deleted", c.getInt(4) != 0))
        }
        return JSONObject().put("schema", 1).put("historyClearBefore", metadataLong("history_clear_before"))
            .put("history", history).put("bookmarks", bookmarks).put("savedTabGroups", groups)
            .put("settings", settings).put("settingsUpdatedAt", settingsUpdatedAt)
    }

    private fun metadataLong(key: String): Long = getMetadata(key)?.toLongOrNull() ?: 0L
    private fun getMetadata(key: String): String? = readableDatabase.rawQuery("SELECT value FROM metadata WHERE key = ?", arrayOf(key)).use { if (it.moveToFirst()) it.getString(0) else null }
    private fun setMetadata(key: String, value: String) {
        writableDatabase.insertWithOnConflict("metadata", null, ContentValues().apply { put("key", key); put("value", value) }, SQLiteDatabase.CONFLICT_REPLACE)
    }

    private fun isWebUrl(value: String): Boolean {
        val uri = runCatching { Uri.parse(value) }.getOrNull() ?: return false
        return uri.scheme in setOf("http", "https") && !uri.host.isNullOrBlank() && uri.userInfo.isNullOrEmpty()
    }
}
