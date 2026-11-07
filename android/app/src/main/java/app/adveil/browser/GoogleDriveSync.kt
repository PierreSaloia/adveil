package app.adveil.browser

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/** Stores one app-private JSON snapshot in Google Drive's appDataFolder. */
object GoogleDriveSync {
    private const val BASE = "https://www.googleapis.com/drive/v3/files"
    private const val UPLOAD = "https://www.googleapis.com/upload/drive/v3/files"
    private const val SNAPSHOT_NAME = "adveil-browser-sync.json"

    /** Downloads remote state, lets the caller merge it with local data, and uploads the result. */
    fun synchronize(accessToken: String, merge: (JSONObject?) -> JSONObject): JSONObject {
        val fileId = findSnapshot(accessToken)
        val remote = fileId?.let { download(accessToken, it) }
        val merged = merge(remote)
        if (fileId == null) {
            val createdId = createMetadata(accessToken)
            upload(accessToken, createdId, merged)
        } else {
            upload(accessToken, fileId, merged)
        }
        return merged
    }

    private fun findSnapshot(token: String): String? {
        val q = "name='$SNAPSHOT_NAME' and trashed=false"
        val query = "spaces=appDataFolder&q=${encode(q)}&fields=files(id,name,modifiedTime)&pageSize=10"
        val json = JSONObject(request("GET", "$BASE?$query", token))
        val files = json.optJSONArray("files") ?: return null
        return if (files.length() == 0) null else files.optJSONObject(0)?.optString("id")?.takeIf(String::isNotBlank)
    }

    private fun download(token: String, id: String): JSONObject = JSONObject(
        request("GET", "$BASE/${encodePath(id)}?alt=media", token),
    )

    private fun createMetadata(token: String): String {
        val metadata = JSONObject().put("name", SNAPSHOT_NAME).put("mimeType", "application/json").put("parents", org.json.JSONArray().put("appDataFolder"))
        val response = JSONObject(request("POST", "$BASE?fields=id", token, metadata.toString()))
        return response.optString("id").takeIf(String::isNotBlank) ?: error("O Google Drive não retornou o ID do backup.")
    }

    private fun upload(token: String, id: String, content: JSONObject) {
        val media = content.toString().toByteArray(Charsets.UTF_8)
        val initiate = (URL("$UPLOAD/${encodePath(id)}?uploadType=resumable").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("X-HTTP-Method-Override", "PATCH")
            setRequestProperty("X-Upload-Content-Type", "application/json")
            setRequestProperty("X-Upload-Content-Length", media.size.toString())
        }
        val sessionUrl = try {
            initiate.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write("{}") }
            val code = initiate.responseCode
            if (code !in 200..299) throw driveError(initiate)
            initiate.getHeaderField("Location") ?: error("O Google Drive não iniciou o upload do backup.")
        } finally {
            initiate.disconnect()
        }

        val upload = (URL(sessionUrl).openConnection() as HttpURLConnection).apply {
            requestMethod = "PUT"
            connectTimeout = 20_000
            readTimeout = 60_000
            doOutput = true
            setFixedLengthStreamingMode(media.size.toLong())
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
        }
        try {
            upload.outputStream.use { it.write(media) }
            val code = upload.responseCode
            if (code !in 200..299) throw driveError(upload)
        } finally {
            upload.disconnect()
        }
    }

    private fun driveError(connection: HttpURLConnection): IllegalStateException {
        val code = connection.responseCode
        val text = (if (code in 200..299) connection.inputStream else connection.errorStream)
            ?.use { input -> BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText() }.orEmpty()
        val detail = runCatching { JSONObject(text).optJSONObject("error")?.optString("message") }.getOrNull()
        return IllegalStateException(detail?.takeIf(String::isNotBlank) ?: "Google Drive respondeu HTTP $code.")
    }

    private fun request(
        method: String,
        url: String,
        token: String,
        body: String? = null,
    ): String {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 20_000
            readTimeout = 30_000
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }
        try {
            if (body != null) connection.outputStream.bufferedWriter(Charsets.UTF_8).use { it.write(body) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.use { input -> BufferedReader(InputStreamReader(input, Charsets.UTF_8)).readText() }.orEmpty()
            if (code !in 200..299) {
                val detail = runCatching { JSONObject(text).optJSONObject("error")?.optString("message") }.getOrNull()
                error(detail?.takeIf(String::isNotBlank) ?: "Google Drive respondeu HTTP $code.")
            }
            return text
        } finally {
            connection.disconnect()
        }
    }

    private fun encode(value: String) = URLEncoder.encode(value, "UTF-8")
    private fun encodePath(value: String) = value.replace("%", "%25").replace("/", "%2F")
}
