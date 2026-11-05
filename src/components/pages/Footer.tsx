import { StubLink } from "@/components/ui/StubLink";

const GROUPS: Array<{ title: string; links: Array<[label: string, href: string]> }> = [
  { title: "Company", links: [["About", "/about"], ["Jobs", "/jobs"], ["For the Record", "/record"]] },
  {
    title: "Communities",
    links: [
      ["For Artists", "/artists-hub"],
      ["Creators", "/creators"],
      ["Authors", "/authors"],
      ["Developers", "/developers"],
      ["Advertising", "/advertising"],
      ["Investors", "/investors"],
      ["Vendors", "/vendors"],
    ],
  },
  {
    title: "Useful links",
    links: [
      ["Support", "/support"],
      ["Free Mobile App", "/mobile"],
      ["Popular by Country", "/popular"],
      ["Top Song Lyrics", "/lyrics"],
      ["Import your music", "/import"],
    ],
  },
  {
    title: "Plans",
    links: [
      ["Premium Standard", "/plans/standard"],
      ["Platinum", "/plans/platinum"],
      ["Student", "/plans/student"],
      ["Free", "/plans/free"],
    ],
  },
];

const SOCIAL = ["Instagram", "X", "Facebook"] as const;

/** Page footer shared by the home and search pages. Every link is a stub. */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/10 pt-10">
      <nav aria-label="Footer" className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h4 className="mb-3 font-bold">{group.title}</h4>
            <ul className="space-y-2 text-sm text-subtle">
              {group.links.map(([label, href]) => (
                <li key={label}>
                  <StubLink href={href} feature={label} className="hover:text-white hover:underline">
                    {label}
                  </StubLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <ul className="col-span-2 flex gap-3 lg:col-span-1">
          {SOCIAL.map((name) => (
            <li key={name}>
              <StubLink
                href={`/social/${name.toLowerCase()}`}
                feature={`${name} link`}
                aria-label={name}
                className="grid size-10 place-items-center rounded-full bg-raised text-sm font-bold hover:bg-white hover:text-black"
              >
                {name.slice(0, 1)}
              </StubLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className="mt-10 text-sm text-subtle">
        Unofficial study recreation with original mock data — not affiliated with or endorsed by
        Spotify.
      </p>
    </footer>
  );
}
