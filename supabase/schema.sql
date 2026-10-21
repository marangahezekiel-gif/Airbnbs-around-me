-- Airbnbs Around Me — Supabase schema.
-- Run this once in the Supabase dashboard → SQL Editor.
--
-- The app talks to these tables only from the server, using the service-role
-- key, so Row Level Security is switched ON with no policies: nobody can read
-- or write them with the public anon key.

create table if not exists profiles (
  "id"           text primary key,
  "email"        text not null unique,
  "name"         text not null,
  "role"         text not null check ("role" in ('host', 'guest')),
  "passwordHash" text not null,
  "createdAt"    text not null
);

create table if not exists listings (
  "id"            text primary key,
  "hostId"        text not null references profiles ("id") on delete cascade,
  "title"         text not null,
  "description"   text not null,
  "pricePerNight" double precision not null,
  "currency"      text not null,
  "propertyType"  text not null check ("propertyType" in ('entire_place', 'private_room')),
  "bedrooms"      integer not null,
  "beds"          integer not null,
  "bathrooms"     double precision not null,
  "maxGuests"     integer not null,
  "amenities"     text not null,   -- JSON array
  "houseRules"    text not null,
  "photos"        text not null,   -- JSON array of URLs
  "address"       text not null,
  "neighborhood"  text not null,
  "lat"           double precision not null,
  "lng"           double precision not null,
  "instantBook"   boolean not null,
  "blockedDates"  text not null,   -- JSON array of yyyy-mm-dd
  "createdAt"     text not null,
  "updatedAt"     text not null
);
create index if not exists listings_host_idx on listings ("hostId");
create index if not exists listings_geo_idx on listings ("lat", "lng");

create table if not exists units (
  "id"        text primary key,
  "listingId" text not null references listings ("id") on delete cascade,
  "label"     text not null
);
create index if not exists units_listing_idx on units ("listingId");

create table if not exists bookings (
  "id"         text primary key,
  "listingId"  text not null references listings ("id") on delete cascade,
  "unitId"     text references units ("id") on delete set null,
  "guestId"    text not null references profiles ("id") on delete cascade,
  "guestName"  text not null,
  "guestEmail" text not null,
  "checkIn"    text not null,
  "checkOut"   text not null,
  "guests"     integer not null,
  "note"       text not null,
  "nights"     integer not null,
  "totalPrice" double precision not null,
  "currency"   text not null,
  "status"     text not null check ("status" in ('pending', 'accepted', 'rejected', 'cancelled')),
  "createdAt"  text not null,
  "decidedAt"  text
);
create index if not exists bookings_listing_idx on bookings ("listingId");
create index if not exists bookings_guest_idx on bookings ("guestId");

alter table profiles enable row level security;
alter table listings enable row level security;
alter table units    enable row level security;
alter table bookings enable row level security;

-- Photo uploads: create a PUBLIC storage bucket named "listing-photos"
-- (Storage → New bucket → tick "Public bucket").
