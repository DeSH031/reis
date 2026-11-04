import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { registerFonts } from "./fonts";
import { RequestPdf } from "./RequestPdf";
import { InvoicePdf } from "./InvoicePdf";
import { ActPdf } from "./ActPdf";
import { TtnPdf } from "./TtnPdf";
import type { DocumentSnapshot } from "../types";

export async function renderDocumentPdfBuffer(snapshot: DocumentSnapshot): Promise<Buffer> {
  registerFonts();

  let element: React.ReactElement<DocumentProps>;
  switch (snapshot.document.doc_type) {
    case "request":
      element = React.createElement(RequestPdf, { data: snapshot }) as React.ReactElement<DocumentProps>;
      break;
    case "invoice":
      element = React.createElement(InvoicePdf, { data: snapshot }) as React.ReactElement<DocumentProps>;
      break;
    case "act":
      element = React.createElement(ActPdf, { data: snapshot }) as React.ReactElement<DocumentProps>;
      break;
    case "ttn":
      element = React.createElement(TtnPdf, { data: snapshot }) as React.ReactElement<DocumentProps>;
      break;
    default:
      throw new Error(`Неизвестный тип документа: ${snapshot.document.doc_type}`);
  }

  return await renderToBuffer(element);
}
