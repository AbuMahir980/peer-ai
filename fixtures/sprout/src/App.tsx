import { PlantList } from "./features/plants/PlantList";
import { PlantForm } from "./features/plants/PlantForm";

export function App() {
  return (
    <main>
      <h1>Sprout</h1>
      <PlantForm />
      <PlantList />
    </main>
  );
}
