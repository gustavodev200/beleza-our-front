/** Link "Como chegar" do Google Maps: coordenadas quando existem, senão o endereço. */
export function mapsLink(b: {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood: string;
  name: string;
  city?: { name: string; state: string };
}): string {
  const query =
    b.latitude !== null && b.longitude !== null
      ? `${b.latitude},${b.longitude}`
      : [b.address, b.neighborhood, b.city ? `${b.city.name} - ${b.city.state}` : undefined].filter(Boolean).join(", ") || b.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
