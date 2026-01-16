export default function NavigationBar(links: string[]) {
  if (!links) return null;
  return (
    <div className="flex">
      {links.map((link) => (
        <div>{link}</div>
      ))}
    </div>
  );
}
