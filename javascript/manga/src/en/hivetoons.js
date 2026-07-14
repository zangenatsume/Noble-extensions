// ==MangaYomiExtension==
// @name            HiveToons
// @id              en_hivetoons
// @version         1.0.0
// @author          Extension Developer
// @lang            en
// @source          https://hivetoons.org
// @description     Read manga, manhwa and manhua from HiveToons (hivetoons.org)
// @iconUrl         https://storage.hivetoon.com/public/upload/2024/12/05/logo-end-1 (1)-09f57d7d7ea3f031.webp
// @type            manga
// ==/MangaYomiExtension==

const SOURCE = {
    id: "en_hivetoons",
    name: "HiveToons",
    lang: "en",
    baseUrl: "https://hivetoons.org",
    apiUrl: "https://api.hivetoons.org",
    storageUrl: "https://storage.hivetoon.com",
    iconUrl: "https://storage.hivetoon.com/public/upload/2024/12/05/logo-end-1 (1)-09f57d7d7ea3f031.webp",
    typeSource: "single",
    itemType: 0,
    version: "1.0.0"
};

class HiveToons extends MProvider {
    constructor() {
        super();
        this.client = new Client();
    }

    /**
     * Helper: Extract JSON from astro-island props in HTML
     */
    _extractAstroIslandData(html, componentName) {
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
            return this._decodeAstroProps(propsData);
        } catch (e) {
            console.error("Error extracting astro data:", e.message);
            return null;
        }
    }

    /**
     * Helper: Decode Astro's custom prop encoding format
     */
    _decodeAstroProps(obj) {
        if (Array.isArray(obj)) {
            const [type, value] = obj;
            
            switch (type) {
                case 0: // Literal value
                    return value;
                case 1: // Array
                    return value.map(item => this._decodeAstroProps(item));
                default:
                    return value;
            }
        }
        
        if (typeof obj === 'object' && obj !== null) {
            const decoded = {};
            for (const [key, value] of Object.entries(obj)) {
                decoded[key] = this._decodeAstroProps(value);
            }
            return decoded;
        }
        
        return obj;
    }

    /**
     * Helper: Parse series from extracted data
     */
    _parseSeries(item) {
        return {
            name: item.postTitle || item.title || "Unknown",
            imageUrl: item.featuredImage || "",
            link: `${SOURCE.baseUrl}/series/${item.slug}`,
            description: item.description || item.summary || ""
        };
    }

    /**
     * Helper: Map status to numeric code
     */
    _mapStatus(status) {
        if (!status) return 5;
        const s = status.toUpperCase();
        if (s.includes("ONGOING")) return 0;
        if (s.includes("COMPLET")) return 1;
        if (s.includes("HIATUS") || s.includes("SEASON")) return 2;
        if (s.includes("DROP") || s.includes("CANCEL")) return 3;
        return 5;
    }

    /**
     * Get popular manga
     */
    async getPopular(page) {
        try {
            const url = `${SOURCE.baseUrl}/series?page=${page}&sortBy=popular&sortDirection=desc`;
            const response = await this.client.get(url);
            const html = response.body;
            
            // Extract series list from embedded data
            const data = this._extractAstroIslandData(html, "ArchivesPostListIsland");
            
            if (!data || !data.initialPosts) {
                return { list: [], hasNextPage: false };
            }
            
            const series = data.initialPosts.map(item => this._parseSeries(item));
            const totalCount = data.initialTotalCount || 0;
            const itemsPerPage = data.itemsPerPage || 42;
            const hasNextPage = (page * itemsPerPage) < totalCount;
            
            return {
                list: series,
                hasNextPage: hasNextPage
            };
        } catch (e) {
            console.error("getPopular error:", e.message);
            return { list: [], hasNextPage: false };
        }
    }

    /**
     * Get latest updates
     */
    async getLatestUpdates(page) {
        try {
            const url = `${SOURCE.baseUrl}/series?page=${page}&sortBy=latest_chapters&sortDirection=desc`;
            const response = await this.client.get(url);
            const html = response.body;
            
            const data = this._extractAstroIslandData(html, "ArchivesPostListIsland");
            
            if (!data || !data.initialPosts) {
                return { list: [], hasNextPage: false };
            }
            
            const series = data.initialPosts.map(item => this._parseSeries(item));
            const totalCount = data.initialTotalCount || 0;
            const itemsPerPage = data.itemsPerPage || 42;
            const hasNextPage = (page * itemsPerPage) < totalCount;
            
            return {
                list: series,
                hasNextPage: hasNextPage
            };
        } catch (e) {
            console.error("getLatestUpdates error:", e.message);
            return { list: [], hasNextPage: false };
        }
    }

    /**
     * Search manga
     */
    async search(query, page, filters) {
        try {
            let url = `${SOURCE.baseUrl}/series?page=${page}`;
            
            if (query) {
                url += `&searchTerm=${encodeURIComponent(query)}`;
            }
            
            // Apply filters if provided
            if (filters) {
                if (filters.genre) url += `&genres=${filters.genre}`;
                if (filters.status) url += `&seriesStatus=${filters.status}`;
                if (filters.type) url += `&seriesType=${filters.type}`;
                if (filters.sortBy) url += `&sortBy=${filters.sortBy}`;
            }
            
            const response = await this.client.get(url);
            const html = response.body;
            
            const data = this._extractAstroIslandData(html, "ArchivesPostListIsland");
            
            if (!data || !data.initialPosts) {
                return { list: [], hasNextPage: false };
            }
            
            const series = data.initialPosts.map(item => this._parseSeries(item));
            const totalCount = data.initialTotalCount || 0;
            const itemsPerPage = data.itemsPerPage || 42;
            const hasNextPage = (page * itemsPerPage) < totalCount;
            
            return {
                list: series,
                hasNextPage: hasNextPage
            };
        } catch (e) {
            console.error("search error:", e.message);
            return { list: [], hasNextPage: false };
        }
    }

    /**
     * Get manga details and chapter list
     */
    async getDetail(url) {
        try {
            const response = await this.client.get(url);
            const html = response.body;
            
            // Extract series data from page
            const data = this._extractAstroIslandData(html, "SeriesIsland");
            
            if (!data || !data.series) {
                throw new Error("Could not extract series details");
            }
            
            const series = data.series;
            
            // Parse chapters
            const chapters = (series.chapters || []).map(ch => ({
                name: ch.title ? `Chapter ${ch.number}: ${ch.title}` : `Chapter ${ch.number}`,
                url: `${SOURCE.baseUrl}/series/${series.slug}/${ch.slug}`,
                dateUpload: ch.createdAt || ""
            }));
            
            // Reverse to show oldest first (Mangayomi expects this)
            chapters.reverse();
            
            return {
                imageUrl: series.featuredImage || "",
                name: series.postTitle || series.title || "Unknown",
                description: series.description || series.summary || "",
                author: series.author || "Unknown",
                artist: series.artist || series.author || "Unknown",
                genre: (series.genres || []).map(g => g.name).join(", "),
                status: this._mapStatus(series.seriesStatus),
                chapters: chapters
            };
        } catch (e) {
            console.error("getDetail error:", e.message);
            throw e;
        }
    }

    /**
     * Get chapter pages/images
     */
    async getPageList(url) {
        try {
            const response = await this.client.get(url);
            const html = response.body;
            
            // Extract chapter data
            const data = this._extractAstroIslandData(html, "ChapterIsland");
            
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
            return pages.map(page => {
                if (typeof page === 'string') {
                    return page;
                }
                return page.url || page.imageUrl || page.src || "";
            }).filter(url => url !== "");
            
        } catch (e) {
            console.error("getPageList error:", e.message);
            throw e;
        }
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

    /**
     * Get source metadata
     */
    getSource() {
        return SOURCE;
    }
}

// Export the extension
const extension = new HiveToons();
