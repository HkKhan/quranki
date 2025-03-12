# Creating an OpenGraph Image for QuranKi using your Logo

I've updated the layout to use your existing QuranKi logo in link previews. Here are two options for creating the best appearance in iMessage and social media:

## Option 1: Use Your Logo Directly (Current Setup)

Your existing logo is now configured for social media previews:

- We're using your `quranki_logo.png` (1024x1024) directly
- This works well for platforms that support square images (like Twitter's summary card)
- For this approach, no further action is needed

## Option 2: Create a Branded Social Image (Recommended)

For the best appearance across all platforms (including iMessage), create a proper 1200×630 image:

1. Open the `public/og-image-template.html` file in a web browser
2. This template includes your logo along with text in the optimal 1200×630 dimensions
3. Take a screenshot of the entire browser window
4. Save the screenshot as `public/og-image.png`
5. Update layout.tsx to reference this new optimized image:

```typescript
openGraph: {
  // ...other properties...
  images: [
    {
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "QuranKi Logo - Spaced Repetition for Quran Memorization",
    },
  ],
},
twitter: {
  // ...other properties...
  images: ["/og-image.png"],
},
```

## Why Option 2 Is Recommended

- iMessage prefers images with 1200×630 dimensions (1.91:1 aspect ratio)
- Facebook, LinkedIn and other social platforms optimize for this size
- Your branding will look more professional and complete with both logo and text

## Checking Your Implementation

After choosing an option and deploying, validate your OpenGraph tags:

- [OpenGraph.xyz](https://www.opengraph.xyz/) - Enter your website URL
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) - Enter your website URL
