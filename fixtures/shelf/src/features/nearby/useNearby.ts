import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { analytics } from "../../lib/analytics";
import { http } from "../../lib/http";

export interface NearbyBook {
  id: string;
  title: string;
  distanceMetres: number;
}

export function useNearby() {
  const [books, setBooks] = useState<NearbyBook[]>([]);

  useEffect(() => {
    void (async () => {
      await Location.requestForegroundPermissionsAsync();
      await Location.requestBackgroundPermissionsAsync();
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      analytics.track("nearby_opened", { lat: coords.latitude, lng: coords.longitude });
      setBooks(await http<NearbyBook[]>(`/books/nearby?lat=${String(coords.latitude)}&lng=${String(coords.longitude)}`));
    })();
  }, []);

  return books;
}
