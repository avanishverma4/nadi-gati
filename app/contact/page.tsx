import { permanentRedirect } from "next/navigation";

// Old short address for the contact page. Redirect so there is only one copy of the page.
export default function ContactRedirect() {
  permanentRedirect("/about/contact");
}
