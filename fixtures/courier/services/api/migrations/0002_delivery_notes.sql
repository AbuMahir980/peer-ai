-- Couriers now write their own notes in delivery_notes.
ALTER TABLE parcels ADD COLUMN delivery_notes TEXT;
ALTER TABLE parcels DROP COLUMN notes;
