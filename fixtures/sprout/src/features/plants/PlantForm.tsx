import { useState, type FormEvent } from "react";
import { db } from "../../db";

export function PlantForm() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function add(event: FormEvent) {
    event.preventDefault();
    const position = await db.plants.count();
    await db.plants.add({ name, room, position, ...(file === null ? {} : { photo: file }) });
    setName("");
    setRoom("");
    setFile(null);
  }

  return (
    <form onSubmit={add}>
      <label>
        Name <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Room <input value={room} onChange={(e) => setRoom(e.target.value)} />
      </label>
      <label>
        Photo <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
      <button type="submit">Add plant</button>
    </form>
  );
}
