/**
 * Legacy compatibility wrapper. Root-level custom CSS/JavaScript and analytics
 * injection is handled by src/app/layout.tsx so code lands in the real
 * document Head/Body/Footer positions and is never duplicated.
 */
export default async function RootSettingsLoader({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
