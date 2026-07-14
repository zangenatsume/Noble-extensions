# Noble Extensions

Mangayomi extension repository for various manga sources.

## Available Extensions

### HiveToons (English)
- **Base URL**: https://hivetoons.org
- **Version**: 1.0.0
- **Language**: English
- **Type**: Manga/Manhwa

## Installation

1. Open Mangayomi app
2. Go to **Browse** → **Extensions**
3. Tap the **+** button (Add repository)
4. Enter this repository URL:
   ```
   https://raw.githubusercontent.com/zangenatsume/Noble-extensions/main/index.json
   ```
5. The HiveToons extension will appear in your available extensions list
6. Install it and enjoy reading!

## Features

### HiveToons Extension
- Browse popular manga/manhwa
- Get latest updates
- Search with filters (sort, status, type, genre)
- View detailed manga information
- Read chapters with high-quality images
- 19 genre filters available

## Repository Structure

```
Noble-extensions/
├── index.json                           # Extension catalog
├── javascript/
│   └── manga/
│       └── src/
│           └── en/
│               └── hivetoons.js        # HiveToons extension source
└── README.md
```

## Technical Details

HiveToons uses:
- **Framework**: Astro SSR (Server-Side Rendering)
- **Data extraction**: Astro island component props parsing
- **Image hosting**: storage.hivetoon.com
- **Status mapping**: ongoing=0, completed=1, hiatus=2, dropped=3

## Contributing

Feel free to contribute additional extensions to this repository. Follow the Mangayomi JavaScript extension guidelines.

## Support

For issues specific to extensions in this repository, please open an issue on GitHub.

## License

Extensions in this repository are provided as-is for educational purposes.
