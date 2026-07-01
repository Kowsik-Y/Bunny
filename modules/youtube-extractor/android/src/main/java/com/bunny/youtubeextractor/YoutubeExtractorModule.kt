package com.bunny.youtubeextractor

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.services.youtube.YoutubeJavaScriptPlayerManager
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class SimpleDownloader : Downloader() {
  private val client = OkHttpClient()

  @Throws(IOException::class)
  override fun execute(request: Request): Response {
    val httpMethod = request.httpMethod()
    val url = request.url()
    val headers = request.headers()
    val dataToSend = request.dataToSend()

    val requestBuilder = okhttp3.Request.Builder()
      .method(httpMethod, dataToSend?.toRequestBody())
      .url(url)

    headers.forEach { (headerName, headerValueList) ->
      headerValueList.forEach { headerValue ->
        requestBuilder.addHeader(headerName, headerValue)
      }
    }

    val response = client.newCall(requestBuilder.build()).execute()
    val responseBody = response.body?.string() ?: ""
    return Response(
      response.code,
      response.message,
      response.headers.toMultimap(),
      responseBody,
      response.request.url.toString()
    )
  }
}

class YoutubeExtractorModule : Module() {
  private var isInitialized = false

  private fun initExtractor() {
    if (!isInitialized) {
      try {
        NewPipe.init(SimpleDownloader())
        isInitialized = true
      } catch (e: Exception) {
        e.printStackTrace()
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("YoutubeExtractor")

    AsyncFunction("deobfuscateUrl") { videoId: String, streamUrl: String?, signatureCipher: String? ->
      initExtractor()
      try {
        var url = streamUrl
        if (url == null && signatureCipher != null) {
          val uri = Uri.parse("?" + signatureCipher)
          val s = uri.getQueryParameter("s") ?: throw Exception("Missing signature (s)")
          val sp = uri.getQueryParameter("sp") ?: "sig"
          val baseUrl = uri.getQueryParameter("url") ?: throw Exception("Missing base url")

          val decryptedSig = YoutubeJavaScriptPlayerManager.deobfuscateSignature(videoId, s)

          val baseUri = Uri.parse(baseUrl).buildUpon()
          baseUri.appendQueryParameter(sp, decryptedSig)
          url = baseUri.build().toString()
        }

        if (url != null) {
          YoutubeJavaScriptPlayerManager.getUrlWithThrottlingParameterDeobfuscated(videoId, url)
        } else {
          null
        }
      } catch (e: Exception) {
        "ERROR: ${e.message}"
      }
    }
  }
}
