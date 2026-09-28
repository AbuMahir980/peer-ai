import { useState, type FormEvent } from "react";
import { api } from "../api";
import { quote } from "../lib/price";

export function BookPickup({ onBooked }: { onBooked: (id: number) => void }) {
  const [weight, setWeight] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    const booked = await api<{ id: number }>("/parcels", {
      method: "POST",
      body: JSON.stringify({
        weight_kg: Number(weight),
        pickup_address: pickupAddress,
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_address: recipientAddress,
      }),
    });
    onBooked(booked.id);
  }

  return (
    <form onSubmit={submit}>
      <h1>Book a pickup</h1>
      <input placeholder="Weight (kg)" value={weight} onChange={(e) => setWeight(e.target.value)} />
      <input placeholder="Pickup address" value={pickupAddress} onChange={(e) => setPickupAddress(e.target.value)} />
      <input placeholder="Recipient's name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
      <input placeholder="Recipient's phone" value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} />
      <input
        placeholder="Recipient's address"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      <p>Price: £{quote(Number(weight) || 0).toFixed(2)}</p>
      <div className="button" onClick={() => void submit()}>
        Book
      </div>
    </form>
  );
}
