import { redirect } from "next/navigation";

// A bare /search has no query to show, and the captures only covered
// /search/<query>, so send it home rather than inventing a browse page.
export default function SearchIndex() {
  redirect("/");
}
