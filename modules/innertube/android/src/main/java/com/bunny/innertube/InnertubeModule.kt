package com.bunny.innertube

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.music.innertube.YouTube
import com.music.innertube.YouTube.SearchFilter
import com.music.innertube.models.YouTubeClient
import com.music.innertube.models.YouTubeLocale
import com.music.innertube.models.WatchEndpoint
import com.music.innertube.models.BrowseEndpoint
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking

class InnertubeModule : Module() {
  private val gson = Gson()

  override fun definition() = ModuleDefinition {
    Name("Innertube")

    AsyncFunction("searchSuggestions") { query: String ->
      runBlocking {
        val result = YouTube.searchSuggestions(query)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("searchSummary") { query: String ->
      runBlocking {
        val result = YouTube.searchSummary(query)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("search") { query: String, filterName: String ->
      runBlocking {
        val filter = when (filterName) {
          "SONG" -> SearchFilter.FILTER_SONG
          "VIDEO" -> SearchFilter.FILTER_VIDEO
          "ALBUM" -> SearchFilter.FILTER_ALBUM
          "ARTIST" -> SearchFilter.FILTER_ARTIST
          "FEATURED_PLAYLIST" -> SearchFilter.FILTER_FEATURED_PLAYLIST
          "COMMUNITY_PLAYLIST" -> SearchFilter.FILTER_COMMUNITY_PLAYLIST
          else -> SearchFilter.FILTER_SONG
        }
        val result = YouTube.search(query, filter)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("album") { browseId: String ->
      runBlocking {
        val result = YouTube.album(browseId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("artist") { browseId: String ->
      runBlocking {
        val result = YouTube.artist(browseId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("playlist") { playlistId: String ->
      runBlocking {
        val result = YouTube.playlist(playlistId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("lyrics") { browseId: String ->
      runBlocking {
        val endpoint = BrowseEndpoint(browseId = browseId)
        val result = YouTube.lyrics(endpoint)
        if (result.isSuccess) {
          result.getOrNull()
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("player") { videoId: String ->
      runBlocking {
        val result = YouTube.player(
          videoId = videoId,
          client = YouTubeClient.WEB_REMIX
        )
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }
  }
}
