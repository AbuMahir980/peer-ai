import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "../../db";
import { wateredToday } from "../../lib/dates";

export function PlantList() {
  const plants = useLiveQuery(() => db.plants.orderBy("position").toArray()) ?? [];
  const [dragging, setDragging] = useState<number | null>(null);

  async function moveTo(target: number) {
    if (dragging === null) return;
    await db.plants.update(dragging, { position: target });
    setDragging(null);
  }

  return (
    <ul className="plants">
      {plants.map((plant) => (
        <li key={plant.id} draggable onDragStart={() => setDragging(plant.id ?? null)} onDrop={() => void moveTo(plant.position)}>
          {plant.photo && <img alt="" src={URL.createObjectURL(plant.photo)} width={96} height={96} />}
          <span>{plant.name}</span>
          <span className="muted">{wateredToday(plant.wateredOn) ? "Watered today" : plant.room}</span>
        </li>
      ))}
    </ul>
  );
}
