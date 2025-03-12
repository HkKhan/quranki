# Generating the OG Image for QuranKi

To generate the OG image for better preview links in iMessage and social media, follow these steps:

## Option 1: Using a Browser (Recommended)

1. Open the `public/og-image-html.html` file in a web browser
2. Take a screenshot of the entire page (make sure it captures the full 1200x630 dimensions)
3. Save the screenshot as `public/og-image.png`

## Option 2: Using Chrome Headless (For Developers)

If you have Chrome installed, you can use this command:

```bash
# Make sure you're in the project root directory
cd /Users/haneefkhan/Desktop/dev/v0_quranki/quranki

# Install Chrome headless screenshot tool (one-time)
npm install -g capture-website-cli

# Generate the PNG image
capture-website public/og-image-html.html --output=public/og-image.png --width=1200 --height=630 --type=png
```

## Option 3: Using Online Services

You can use online services that convert HTML to images:

1. Upload the `public/og-image-html.html` file to a service like [HTML/CSS to Image](https://htmlcsstoimage.com/)
2. Set the dimensions to 1200x630
3. Download the generated PNG and save it as `public/og-image.png`

## Checking Your Image

After creating the image, push your changes to GitHub and Vercel. Then you can validate the OG tags using:

- [OpenGraph.xyz](https://www.opengraph.xyz/) - Enter your website URL
- [Twitter Card Validator](https://cards-dev.twitter.com/validator) - Enter your website URL
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) - Enter your website URL
