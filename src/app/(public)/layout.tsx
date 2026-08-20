export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* nav pública, footer, etc. */}
      {children}
    </>
  );
}
