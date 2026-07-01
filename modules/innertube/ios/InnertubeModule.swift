import ExpoModulesCore

public class InnertubeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Innertube")

    AsyncFunction("searchSuggestions") { (query: String) -> String in
      return "{}"
    }

    AsyncFunction("searchSummary") { (query: String) -> String in
      return "{}"
    }

    AsyncFunction("search") { (query: String, filterName: String) -> String in
      return "{}"
    }

    AsyncFunction("album") { (browseId: String) -> String in
      return "{}"
    }

    AsyncFunction("artist") { (browseId: String) -> String in
      return "{}"
    }

    AsyncFunction("playlist") { (playlistId: String) -> String in
      return "{}"
    }

    AsyncFunction("lyrics") { (browseId: String) -> String? in
      return nil
    }

    AsyncFunction("player") { (videoId: String) -> String in
      return "{}"
    }
  }
}
