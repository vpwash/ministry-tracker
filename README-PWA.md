# Ministry Tracker PWA

This is a Progressive Web App (PWA) version of the Ministry Tracker application. It can be installed on your device for offline use.

## Installation

1. **Development Setup**
   ```bash
   # Install dependencies
   npm install
   
   # Run the development server
   npm run dev
   ```

2. **Build for Production**
   ```bash
   # Build the application
   npm run build
   
   # Start the production server
   npm start
   ```

## Installing as a PWA

### On Desktop (Chrome/Edge):
1. Open the app in Chrome or Edge
2. Click the install icon in the address bar (or go to the browser menu > Install)
3. Follow the prompts to install

### On Mobile (Android - Chrome):
1. Open the app in Chrome
2. Tap the menu (three dots) and select "Add to Home screen"
3. Follow the prompts to install

### On iOS (Safari):
1. Open the app in Safari
2. Tap the share button (box with arrow)
3. Select "Add to Home Screen"
4. Follow the prompts to install

## Offline Usage

Once installed, the app will work offline for most features. Your data will be synced when you're back online.

## Updating the App

The app will automatically check for updates when online. To manually check for updates:

1. Close the app completely
2. Reopen it - it will load the latest version if available

## Troubleshooting

- If the app doesn't update, try uninstalling and reinstalling
- Clear your browser cache if you experience any issues
- Make sure you're using a modern browser that supports PWAs (Chrome, Edge, Firefox, Safari)

## Customization

To customize the PWA:

1. Replace the icons in `/public/icons/` with your own
2. Update the colors in `app/layout.tsx` and `public/manifest.json`
3. Modify the app name and description in `app/layout.tsx` and `public/manifest.json`
