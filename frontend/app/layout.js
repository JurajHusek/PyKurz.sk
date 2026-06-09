import "./globals.css";
import "easymde/dist/easymde.min.css";

export const metadata = {
  title: "PyKurz.sk",
  description: "Interaktívny portál s kurzami pre študentov programovania v Pythone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}

