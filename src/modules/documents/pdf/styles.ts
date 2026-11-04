import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 8.5,
    paddingTop: 30,
    paddingBottom: 35,
    paddingLeft: 35,
    paddingRight: 35,
    color: "#111827",
    lineHeight: 1.3,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    textAlign: "center",
    color: "#4b5563",
    marginBottom: 12,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    paddingBottom: 2,
    marginBottom: 4,
  },
  gridTwo: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  col: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: 2,
  },
  label: {
    color: "#4b5563",
    width: "35%",
    fontSize: 8,
  },
  value: {
    flex: 1,
    fontWeight: "normal",
    fontSize: 8,
  },
  valueBold: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#111827",
    marginTop: 6,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  tableHeader: {
    backgroundColor: "#f3f4f6",
    fontWeight: "bold",
  },
  tableCell: {
    padding: 3,
    fontSize: 7.5,
    borderRightWidth: 1,
    borderRightColor: "#111827",
  },
  tableCellLast: {
    padding: 3,
    fontSize: 7.5,
  },
  textRight: {
    textAlign: "right",
  },
  textCenter: {
    textAlign: "center",
  },
  totalsBox: {
    marginTop: 6,
    marginBottom: 10,
    alignSelf: "flex-end",
    width: "50%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  wordsBox: {
    marginTop: 6,
    marginBottom: 12,
    padding: 6,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  wordsText: {
    fontSize: 8,
    fontWeight: "bold",
  },
  signaturesBox: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureCol: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
    marginTop: 20,
    marginBottom: 4,
  },
  signatureHint: {
    fontSize: 7,
    color: "#6b7280",
    textAlign: "center",
  },
});
