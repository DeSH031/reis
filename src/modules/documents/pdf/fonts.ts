import path from "path";
import { Font } from "@react-pdf/renderer";

let registered = false;

export function registerFonts(): void {
  if (registered) return;

  const regular = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const bold = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const italic = path.join(process.cwd(), "public", "fonts", "Roboto-Italic.ttf");

  Font.register({
    family: "Roboto",
    fonts: [
      { src: regular, fontWeight: "normal", fontStyle: "normal" },
      { src: bold, fontWeight: "bold", fontStyle: "normal" },
      { src: italic, fontWeight: "normal", fontStyle: "italic" },
    ],
  });

  registered = true;
}
