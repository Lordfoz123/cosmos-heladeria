import Header from "@/components/Header";

export default function TiendaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}