/** Link "Como chegar" do Google Maps: coordenadas quando existem, senão o endereço. */
export function mapsLink(b: {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  neighborhood: string;
  name: string;
}): string {
  const query =
    b.latitude !== null && b.longitude !== null
      ? `${b.latitude},${b.longitude}`
      : [b.address, b.neighborhood, "Goiânia - GO"].filter(Boolean).join(", ") || b.name;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
