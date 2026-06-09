import "./globals.css";
import "easymde/dist/easymde.min.css";

export const metadata = {
  title: "Python Course Portal",
  description: "Markdown kurzy s lokalne spustitelnym Pythonom cez Pyodide.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}

