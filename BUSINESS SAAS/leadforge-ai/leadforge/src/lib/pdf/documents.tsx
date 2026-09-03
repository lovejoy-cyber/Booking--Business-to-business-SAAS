import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { formatCents } from "@/lib/money";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1C1F26" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  logo: { width: 90, height: 90, objectFit: "contain" },
  businessName: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  muted: { color: "#8B93A1" },
  docTitle: { fontSize: 20, fontWeight: 700, textAlign: "right" },
  docMeta: { textAlign: "right", marginTop: 4 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 9, textTransform: "uppercase", color: "#8B93A1", marginBottom: 4, letterSpacing: 1 },
  table: { marginTop: 8 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1C1F26",
    paddingBottom: 6,
    marginBottom: 6
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E4E7EC"
  },
  colDesc: { flex: 4 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1.5, textAlign: "right" },
  colTotal: { flex: 1.5, textAlign: "right" },
  totalsBlock: { marginTop: 14, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#1C1F26"
  },
  grandTotalLabel: { fontSize: 12, fontWeight: 700 },
  grandTotalValue: { fontSize: 12, fontWeight: 700 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 8, color: "#8B93A1" }
});

type DocLine = { description: string; quantity: number; unitPriceCents: number; lineTotalCents: number };

export type BusinessInfo = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logoUrl?: string | null;
};

export type PartyInfo = {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
};

function HeaderBlock({
  business,
  docLabel,
  number,
  date,
  extraMeta
}: {
  business: BusinessInfo;
  docLabel: string;
  number: string;
  date: string;
  extraMeta?: string;
}) {
  return (
    <View style={styles.headerRow}>
      <View>
        {business.logoUrl ? <Image src={business.logoUrl} style={styles.logo} /> : null}
        <Text style={styles.businessName}>{business.name}</Text>
        {business.address ? <Text style={styles.muted}>{business.address}</Text> : null}
        {business.phone ? <Text style={styles.muted}>{business.phone}</Text> : null}
        {business.email ? <Text style={styles.muted}>{business.email}</Text> : null}
      </View>
      <View>
        <Text style={styles.docTitle}>{docLabel}</Text>
        <Text style={styles.docMeta}>{number}</Text>
        <Text style={[styles.docMeta, styles.muted]}>{date}</Text>
        {extraMeta ? <Text style={[styles.docMeta, styles.muted]}>{extraMeta}</Text> : null}
      </View>
    </View>
  );
}

function LineItemsTable({ lines, currency }: { lines: DocLine[]; currency: string }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeaderRow}>
        <Text style={styles.colDesc}>Description</Text>
        <Text style={styles.colQty}>Qty</Text>
        <Text style={styles.colPrice}>Unit price</Text>
        <Text style={styles.colTotal}>Total</Text>
      </View>
      {lines.map((line, i) => (
        <View style={styles.tableRow} key={i}>
          <Text style={styles.colDesc}>{line.description}</Text>
          <Text style={styles.colQty}>{line.quantity}</Text>
          <Text style={styles.colPrice}>{formatCents(line.unitPriceCents, currency)}</Text>
          <Text style={styles.colTotal}>{formatCents(line.lineTotalCents, currency)}</Text>
        </View>
      ))}
    </View>
  );
}

function TotalsBlock({
  subtotalCents,
  discountCents,
  taxCents,
  taxLabel,
  totalCents,
  depositCents,
  currency
}: {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  taxLabel?: string;
  totalCents: number;
  depositCents?: number;
  currency: string;
}) {
  return (
    <View style={styles.totalsBlock}>
      <View style={styles.totalsRow}>
        <Text style={styles.muted}>Subtotal</Text>
        <Text>{formatCents(subtotalCents, currency)}</Text>
      </View>
      {discountCents > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.muted}>Discount</Text>
          <Text>-{formatCents(discountCents, currency)}</Text>
        </View>
      )}
      {taxCents > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.muted}>{taxLabel ?? "Tax"}</Text>
          <Text>{formatCents(taxCents, currency)}</Text>
        </View>
      )}
      <View style={styles.grandTotalRow}>
        <Text style={styles.grandTotalLabel}>Total</Text>
        <Text style={styles.grandTotalValue}>{formatCents(totalCents, currency)}</Text>
      </View>
      {!!depositCents && depositCents > 0 && (
        <View style={styles.totalsRow}>
          <Text style={styles.muted}>Deposit required</Text>
          <Text>{formatCents(depositCents, currency)}</Text>
        </View>
      )}
    </View>
  );
}

export function QuotePdfDocument(props: {
  business: BusinessInfo;
  customer: PartyInfo;
  quoteNumber: string;
  createdAt: string;
  expiresAt?: string | null;
  currency: string;
  taxLabel?: string;
  lines: DocLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  depositCents: number;
  notes?: string | null;
  terms?: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderBlock
          business={props.business}
          docLabel="QUOTE"
          number={props.quoteNumber}
          date={props.createdAt}
          extraMeta={props.expiresAt ? `Valid until ${props.expiresAt}` : undefined}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prepared for</Text>
          <Text>{props.customer.name}</Text>
          {props.customer.address ? <Text style={styles.muted}>{props.customer.address}</Text> : null}
          {props.customer.phone ? <Text style={styles.muted}>{props.customer.phone}</Text> : null}
          {props.customer.email ? <Text style={styles.muted}>{props.customer.email}</Text> : null}
        </View>

        <LineItemsTable lines={props.lines} currency={props.currency} />
        <TotalsBlock
          subtotalCents={props.subtotalCents}
          discountCents={props.discountCents}
          taxCents={props.taxCents}
          taxLabel={props.taxLabel}
          totalCents={props.totalCents}
          depositCents={props.depositCents}
          currency={props.currency}
        />

        {props.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{props.notes}</Text>
          </View>
        ) : null}
        {props.terms ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms</Text>
            <Text>{props.terms}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Generated by {props.business.name} via LeadForge — {props.quoteNumber}
        </Text>
      </Page>
    </Document>
  );
}

export function InvoicePdfDocument(props: {
  business: BusinessInfo;
  customer: PartyInfo;
  invoiceNumber: string;
  createdAt: string;
  dueAt?: string | null;
  currency: string;
  taxLabel?: string;
  lines: DocLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  notes?: string | null;
  status: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <HeaderBlock
          business={props.business}
          docLabel="INVOICE"
          number={props.invoiceNumber}
          date={props.createdAt}
          extraMeta={props.dueAt ? `Due ${props.dueAt}` : undefined}
        />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billed to</Text>
          <Text>{props.customer.name}</Text>
          {props.customer.address ? <Text style={styles.muted}>{props.customer.address}</Text> : null}
          {props.customer.phone ? <Text style={styles.muted}>{props.customer.phone}</Text> : null}
          {props.customer.email ? <Text style={styles.muted}>{props.customer.email}</Text> : null}
        </View>

        <LineItemsTable lines={props.lines} currency={props.currency} />
        <TotalsBlock
          subtotalCents={props.subtotalCents}
          discountCents={props.discountCents}
          taxCents={props.taxCents}
          taxLabel={props.taxLabel}
          totalCents={props.totalCents}
          currency={props.currency}
        />

        {props.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text>{props.notes}</Text>
          </View>
        ) : null}

        <Text style={styles.footer}>
          Status: {props.status} — Generated by {props.business.name} via LeadForge — {props.invoiceNumber}
        </Text>
      </Page>
    </Document>
  );
}
