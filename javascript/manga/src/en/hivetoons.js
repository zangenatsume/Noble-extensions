const baseUrl = "https://hivetoons.org";

/**
 * Helper: Extract JSON from astro-island props in HTML
 */
function extractAstroIslandData(html, componentName) {
    try {
        // Find astro-island with specific component
        const regex = new RegExp(`<astro-island[^>]*component-url="[^"]*${componentName}[^"]*"[^>]*props="([^"]*)"`, 'i');
        const match = html.match(regex);
        
        if (!match) return null;
        
        // HTML decode the props
        const propsEncoded = match[1];
        const propsJson = propsEncoded
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#039;/g, "'");
        
        const propsData = JSON.parse(propsJson);
        
        // Decode the nested array structure [type, value]
        return decodeAstroProps(propsData);
    } catch (e) {
        console.log("Error extracting astro data: " + e.message);
        return null;
    }
}

/**
 * Helper: Decode Astro's custom prop encoding format
 */
function decodeAstroProps(obj) {
    if (Array.isArray(obj)) {
        const type = obj[0];
        const value = obj[1];
        
        if (type === 0) { // Literal value
            return value;
        } else if (type === 1) { // Array
            return value.map(function(item) { return decodeAstroProps(item); });
        } else {
            return value;
        }
    }
    
    if (typeof obj === 'object' && obj !== null) {
        const decoded = {};
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            decoded[key] = decodeAstroProps(obj[key]);
        }
        return decoded;
    }
    
    return obj;
}

/**
 * Helper: Parse series from extracted data
 */
function parseSeries(item) {
    return {
        name: item.postTitle || item.title || "Unknown",
        imageUrl: item.featuredImage || "",
        link: baseUrl + "/series/" + item.slug
    };
}

/**
 * Helper: Map status to numeric code
 */
function mapStatus(status) {
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
async function getPopular(page) {
    const url = baseUrl + "/series?page=" + page + "&sortBy=popular&sortDirection=desc";
    const client = new Client();
    const response = await client.get(url);
    const html = response.body;
    
    // Extract series list from embedded data
    const data = extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
        return { list: [], hasNextPage: false };
    }
    
    const series = [];
    for (let i = 0; i < data.initialPosts.length; i++) {
        series.push(parseSeries(data.initialPosts[i]));
    }
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return {
        list: series,
        hasNextPage: hasNextPage
    };
}

/**
 * Get latest updates
 */
async function getLatestUpdates(page) {
    const url = baseUrl + "/series?page=" + page + "&sortBy=latest_chapters&sortDirection=desc";
    const client = new Client();
    const response = await client.get(url);
    const html = response.body;
    
    const data = extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
        return { list: [], hasNextPage: false };
    }
    
    const series = [];
    for (let i = 0; i < data.initialPosts.length; i++) {
        series.push(parseSeries(data.initialPosts[i]));
    }
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return {
        list: series,
        hasNextPage: hasNextPage
    };
}

/**
 * Search manga
 */
async function search(query, page, filterList) {
    let url = baseUrl + "/series?page=" + page;
    
    if (query) {
        url += "&searchTerm=" + encodeURIComponent(query);
    }
    
    // Apply filters if provided
    if (filterList) {
        for (let i = 0; i < filterList.length; i++) {
            const filter = filterList[i];
            const value = filter.values[filter.state];
            if (value && value.value) {
                if (filter.key === "genre") url += "&genres=" + value.value;
                else if (filter.key === "status") url += "&seriesStatus=" + value.value;
                else if (filter.key === "type") url += "&seriesType=" + value.value;
                else if (filter.key === "sortBy") url += "&sortBy=" + value.value;
            }
        }
    }
    
    const client = new Client();
    const response = await client.get(url);
    const html = response.body;
    
    const data = extractAstroIslandData(html, "ArchivesPostListIsland");
    
    if (!data || !data.initialPosts) {
        return { list: [], hasNextPage: false };
    }
    
    const series = [];
    for (let i = 0; i < data.initialPosts.length; i++) {
        series.push(parseSeries(data.initialPosts[i]));
    }
    
    const totalCount = data.initialTotalCount || 0;
    const itemsPerPage = data.itemsPerPage || 42;
    const hasNextPage = (page * itemsPerPage) < totalCount;
    
    return {
        list: series,
        hasNextPage: hasNextPage
    };
}

/**
 * Get manga details and chapter list
 */
async function getDetail(url) {
    const client = new Client();
    const response = await client.get(url);
    const html = response.body;
    
    // Extract series data from page
    const data = extractAstroIslandData(html, "SeriesIsland");
    
    if (!data || !data.series) {
        throw new Error("Could not extract series details");
    }
    
    const series = data.series;
    
    // Parse chapters
    const chapters = [];
    const chapterList = series.chapters || [];
    for (let i = 0; i < chapterList.length; i++) {
        const ch = chapterList[i];
        chapters.push({
            name: ch.title ? ("Chapter " + ch.number + ": " + ch.title) : ("Chapter " + ch.number),
            url: baseUrl + "/series/" + series.slug + "/" + ch.slug,
            dateUpload: ch.createdAt || ""
        });
    }
    
    // Reverse to show oldest first (Mangayomi expects this)
    chapters.reverse();
    
    // Parse genres
    let genreStr = "";
    const genres = series.genres || [];
    for (let i = 0; i < genres.length; i++) {
        if (i > 0) genreStr += ", ";
        genreStr += genres[i].name;
    }
    
    return {
        imageUrl: series.featuredImage || "",
        name: series.postTitle || series.title || "Unknown",
        description: series.description || series.summary || "",
        author: series.author || "Unknown",
        genre: genreStr,
        status: mapStatus(series.seriesStatus),
        chapters: chapters
    };
}

/**
 * Get chapter pages/images
 */
async function getPageList(url) {
    const client = new Client();
    const response = await client.get(url);
    const html = response.body;
    
    // Extract chapter data
    const data = extractAstroIslandData(html, "ChapterIsland");
    
    if (!data || !data.chapter) {
        throw new Error("Could not extract chapter data");
    }
    
    const chapter = data.chapter;
    
    // Get page images
    const pages = chapter.pages || chapter.images || [];
    
    if (!pages || pages.length === 0) {
        throw new Error("No pages found in chapter");
    }
    
    // Return array of image URLs
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
function getFilterList() {
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
