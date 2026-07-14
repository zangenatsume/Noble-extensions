const mangayomiSources = [
  {
    "name": "HiveToons",
    "id": 947362815,
    "lang": "en",
    "baseUrl": "https://hivetoons.org",
    "apiUrl": "",
    "iconUrl": "https://hivetoons.org/favicon.ico",
    "typeSource": "single",
    "isManga": true,
    "version": "1.1.2",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "manga/src/en/hivetoons.js",
  },
];

class DefaultExtension extends MProvider {
  
  getHeaders(url) {
    return {
      "Referer": this.source.baseUrl,
    };
  }

  /**
   * Helper: Extract JSON from astro-island props in HTML
   */
  extractAstroIslandData(html, componentName) {
    try {
      // Find component name in HTML (it's in the opts attribute)
      const searchStr = `&quot;name&quot;:&quot;${componentName}&quot;`;
      const nameIndex = html.indexOf(searchStr);
      
      if (nameIndex === -1) {
        console.log("Component not found: " + componentName);
        return null;
      }
      
      // Search backward from nameIndex to find props="
      let propsStart = -1;
      for (let i = nameIndex; i >= Math.max(0, nameIndex - 50000); i--) {
        if (html.substring(i, i + 7) === 'props="') {
          propsStart = i + 7;  // Start after 'props="'
          break;
        }
      }
      
      if (propsStart === -1) {
        console.log("No props found before component");
        return null;
      }
      
      // Extract props value until closing quote
      let propsValue = '';
      let depth = 0;
      
      for (let i = propsStart; i < html.length; i++) {
        const char = html[i];
        
        // Stop at closing quote when not inside brackets
        if (char === '"' && depth === 0) {
          break;
        }
        
        propsValue += char;
        
        if (char === '{' || char === '[') depth++;
        if (char === '}' || char === ']') depth--;
      }
      
      // Decode HTML entities
      const propsJson = propsValue
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&#039;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
      
      const propsData = JSON.parse(propsJson);
      return this.decodeAstroProps(propsData);
    } catch (e) {
      console.log("Error extracting astro data: " + e.message);
      console.log("Stack: " + e.stack);
      return null;
    }
  }

  /**
   * Helper: Decode Astro's custom prop encoding format
   */
  decodeAstroProps(obj) {
    if (Array.isArray(obj)) {
      const type = obj[0];
      const value = obj[1];
      
      if (type === 0) {
        return value;
      } else if (type === 1) {
        return value.map(item => this.decodeAstroProps(item));
      } else {
        return value;
      }
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const decoded = {};
      const keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        decoded[key] = this.decodeAstroProps(obj[key]);
      }
      return decoded;
    }
    
    return obj;
  }

  /**
   * Helper: Map status to numeric code
   */
  mapStatus(status) {
    if (!status) return 5;
    const s = status.toUpperCase();
    if (s.indexOf("ONGOING") >= 0) return 0;
    if (s.indexOf("COMPLET") >= 0) return 1;
    if (s.indexOf("HIATUS") >= 0 || s.indexOf("SEASON") >= 0) return 2;
    if (s.indexOf("DROP") >= 0 || s.indexOf("CANCEL") >= 0) return 3;
    return 5;
  }

  /**
   * Get popular manga
   */
  async getPopular(page) {
    const url = `${this.source.baseUrl}/series?page=${page}&sortBy=popular&sortDirection=desc`;
    const client = new Client();
    const response = await client.get(url, this.getHeaders(url));
    const html = response.body;
    
    const data = this.extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
      console.log("No data found in getPopular");
      return { list: [], hasNextPage: false };
    }
    
    const list = [];
    const posts = data.initialPosts;
    for (let i = 0; i < posts.length; i++) {
      const item = posts[i];
      const name = item.postTitle || "Unknown";
      const imageUrl = item.featuredImage || "";
      list.push({
        name: typeof name === 'string' ? name : String(name),
        imageUrl: typeof imageUrl === 'string' ? imageUrl : String(imageUrl),
        link: `${this.source.baseUrl}/series/${item.slug}`
      });
    }
    
    console.log("Found " + list.length + " manga");
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return { list: list, hasNextPage: hasNextPage };
  }

  /**
   * Get latest updates
   */
  async getLatestUpdates(page) {
    const url = `${this.source.baseUrl}/series?page=${page}&sortBy=latest_chapters&sortDirection=desc`;
    const client = new Client();
    const response = await client.get(url, this.getHeaders(url));
    const html = response.body;
    
    const data = this.extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
      return { list: [], hasNextPage: false };
    }
    
    const list = [];
    for (let i = 0; i < data.initialPosts.length; i++) {
      const item = data.initialPosts[i];
      const name = item.postTitle || item.title || "Unknown";
      const imageUrl = item.featuredImage || "";
      list.push({
        name: typeof name === 'string' ? name : String(name),
        imageUrl: typeof imageUrl === 'string' ? imageUrl : String(imageUrl),
        link: `${this.source.baseUrl}/series/${item.slug}`
      });
    }
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return { list, hasNextPage };
  }

  /**
   * Search manga
   */
  async search(query, page, filterList) {
    let url = `${this.source.baseUrl}/series?page=${page}`;
    
    if (query) {
      url += `&searchTerm=${encodeURIComponent(query)}`;
    }
    
    if (filterList) {
      for (let i = 0; i < filterList.length; i++) {
        const filter = filterList[i];
        if (filter.state !== undefined && filter.values && filter.values[filter.state]) {
          const value = filter.values[filter.state].value;
          if (value) {
            if (filter.key === "genre") url += `&genres=${value}`;
            else if (filter.key === "status") url += `&seriesStatus=${value}`;
            else if (filter.key === "type") url += `&seriesType=${value}`;
            else if (filter.key === "sortBy") url += `&sortBy=${value}`;
          }
        }
      }
    }
    
    const client = new Client();
    const response = await client.get(url, this.getHeaders(url));
    const html = response.body;
    
    const data = this.extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
      return { list: [], hasNextPage: false };
    }
    
    const list = [];
    for (let i = 0; i < data.initialPosts.length; i++) {
      const item = data.initialPosts[i];
      const name = item.postTitle || item.title || "Unknown";
      const imageUrl = item.featuredImage || "";
      list.push({
        name: typeof name === 'string' ? name : String(name),
        imageUrl: typeof imageUrl === 'string' ? imageUrl : String(imageUrl),
        link: `${this.source.baseUrl}/series/${item.slug}`
      });
    }
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return { list, hasNextPage };
  }

  /**
   * Get manga details and chapter list
   */
  async getDetail(url) {
    const client = new Client();
    const response = await client.get(url, this.getHeaders(url));
    const html = response.body;
    
    console.log("getDetail: Fetching", url);
    const data = this.extractAstroIslandData(html, "SeriesChaptersPanelIsland");
    
    if (!data) {
      console.log("getDetail: No data extracted from SeriesChaptersPanelIsland");
      throw new Error("Could not extract series details");
    }
    
    console.log("getDetail: Data keys:", Object.keys(data).join(", "));
    
    if (!data.post) {
      console.log("getDetail: No data.post found");
      throw new Error("Could not extract series details");
    }
    
    const series = data.post;
    const chapterList = data.initialChap || data.chapters || [];
    
    console.log("getDetail: Found", chapterList.length, "chapters");
    
    const chapters = [];
    for (let i = 0; i < chapterList.length; i++) {
      const ch = chapterList[i];
      chapters.push({
        name: ch.title ? ("Chapter " + ch.number + ": " + ch.title) : ("Chapter " + ch.number),
        url: `${this.source.baseUrl}/series/${series.slug}/${ch.slug}`,
        dateUpload: ch.createdAt || ""
      });
    }
    
    chapters.reverse();
    
    let genreStr = "";
    const genres = series.genres || [];
    for (let i = 0; i < genres.length; i++) {
      if (i > 0) genreStr += ", ";
      genreStr += genres[i].name;
    }
    
    // Ensure all fields are strings, not arrays
    const getStringValue = (val) => {
      if (Array.isArray(val)) return val.join(", ");
      if (val === null || val === undefined) return "";
      return String(val);
    };
    
    return {
      imageUrl: getStringValue(series.featuredImage),
      name: getStringValue(series.postTitle || series.title || "Unknown"),
      description: getStringValue(series.postContent || series.description || series.summary),
      author: getStringValue(series.author || "Unknown"),
      genre: genreStr,
      status: this.mapStatus(series.seriesStatus),
      chapters: chapters
    };
  }

  /**
   * Get chapter pages/images
   */
  async getPageList(url) {
    const client = new Client();
    const response = await client.get(url, this.getHeaders(url));
    const html = response.body;
    
    const data = this.extractAstroIslandData(html, "ChapterIsland");
    
    if (!data || !data.chapter) {
      throw new Error("Could not extract chapter data");
    }
    
    const chapter = data.chapter;
    const pages = chapter.pages || chapter.images || [];
    
    if (!pages || pages.length === 0) {
      throw new Error("No pages found in chapter");
    }
    
    const urls = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      let imageUrl = "";
      if (typeof page === 'string') {
        imageUrl = page;
      } else {
        imageUrl = page.url || page.imageUrl || page.src || "";
      }
      if (imageUrl) {
        urls.push(imageUrl);
      }
    }
    
    return urls;
  }

  /**
   * Get available filters
   */
  getFilterList() {
    return [
      {
        type_name: "SelectFilter",
        name: "Sort By",
        key: "sortBy",
        values: [
          { label: "Latest Chapters", value: "latest_chapters" },
          { label: "Most Popular", value: "popular" },
          { label: "Newest Added", value: "newest" },
          { label: "Most Chapters", value: "most_chapters" },
          { label: "A-Z", value: "alphabetical" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Status",
        key: "status",
        values: [
          { label: "All", value: "" },
          { label: "Ongoing", value: "ONGOING" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Hiatus", value: "HIATUS" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Type",
        key: "type",
        values: [
          { label: "All", value: "" },
          { label: "Manga", value: "MANGA" },
          { label: "Manhwa", value: "MANHWA" },
          { label: "Manhua", value: "MANHUA" },
          { label: "Novel", value: "NOVEL" }
        ]
      },
      {
        type_name: "SelectFilter",
        name: "Genre",
        key: "genre",
        values: [
          { label: "All", value: "" },
          { label: "Action", value: "5" },
          { label: "Adventure", value: "13" },
          { label: "Comedy", value: "6" },
          { label: "Drama", value: "2" },
          { label: "Fantasy", value: "3" },
          { label: "Horror", value: "34" },
          { label: "Isekai", value: "23" },
          { label: "Martial Arts", value: "14" },
          { label: "Mystery", value: "9" },
          { label: "Romance", value: "25" },
          { label: "School Life", value: "7" },
          { label: "Sci-fi", value: "22" },
          { label: "Seinen", value: "15" },
          { label: "Shoujo", value: "51" },
          { label: "Shounen", value: "4" },
          { label: "Slice of Life", value: "27" },
          { label: "Sports", value: "57" },
          { label: "Supernatural", value: "8" },
          { label: "Thriller", value: "10" }
        ]
      }
    ];
  }
}
