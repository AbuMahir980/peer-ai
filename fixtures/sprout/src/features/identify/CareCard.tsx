import type { Identification } from "./identify";

export function CareCard({ identification }: { identification: Identification }) {
  return (
    <article className="card">
      <h2>This is {identification.species}</h2>
      <p>Safe for pets: {identification.petSafe ? "Yes" : "No"}</p>

      <h3>How to care for it</h3>
      <div dangerouslySetInnerHTML={{ __html: identification.careHtml }} />
    </article>
  );
}
