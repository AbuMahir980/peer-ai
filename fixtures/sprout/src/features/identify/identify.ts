export interface Identification {
  species: string;
  confidence?: number;
  careHtml: string;
  petSafe: boolean;
}

const PLANT_ID_URL = "https://api.plantid.example/v2/identify";
const PLANT_ID_KEY = import.meta.env.VITE_PLANT_ID_KEY;

/** Identifies a plant from a photo taken with the camera or picked from the gallery. */
export async function identify(photo: File): Promise<Identification> {
  const form = new FormData();
  form.append("image", photo);
  form.append("format", "html");
  form.append("details", "care,toxicity");
  return post<Identification>(PLANT_ID_URL, form);
}

async function post<T>(url: string, body: FormData): Promise<T> {
  const headers = { "X-Api-Key": PLANT_ID_KEY };
  const response = await fetch(url, { method: "POST", body, headers });
  return (await response.json()) as T;
}
