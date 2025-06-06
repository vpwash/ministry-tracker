# Ministry Tracker

A Next.js application to track and manage contacts from your ministry work. This application allows you to keep track of people you meet during your ministry, including their contact information and notes about your interactions with them.

## Features

- 📝 Add and manage contacts with names, addresses, phone numbers, and emails
- 📅 Track when you added each person and when you last updated their information
- ✏️ Add timestamped notes about your interactions with each person
- 🔍 Search and filter your contacts
- 💾 Data is stored locally in the browser using IndexedDB
- 🎨 Modern, responsive UI built with Tailwind CSS and shadcn/ui
- ⚡ Fast and performant with Next.js 13+ App Router

## Getting Started

### Prerequisites

- Node.js 16.8 or later
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ministry-tracker.git
   cd ministry-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. **Add a New Person**: Click the "Add Person" button and fill in the person's details.
2. **View/Edit Person**: Click on a person's card to view their details and add notes.
3. **Add Notes**: On a person's detail page, you can add timestamped notes about your interactions.
4. **Edit/Delete**: Update a person's information or remove them from your tracker.

## Data Storage

All data is stored locally in your browser using IndexedDB. This means:
- Your data stays on your device
- No account or internet connection is required
- Your data is private and secure

## Technologies Used

- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type checking
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Dexie.js](https://dexie.org/) - IndexedDB wrapper
- [date-fns](https://date-fns.org/) - Date utilities

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
