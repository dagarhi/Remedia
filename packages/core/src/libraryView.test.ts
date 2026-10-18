import { describe, expect, it } from "vitest";
import { groupByTemplate, queryLibrary, releaseDate } from "./libraryView";
import type { MediaRecord } from "./record";

let n = 0;
const record = (title: string, extra: Partial<MediaRecord> = {}): MediaRecord => ({
  id: String(++n),
  template: "movie",
  parent_id: null,
  title,
  original_title: null,
  status: "completed",
  rating: null,
  notes: null,
  fields: {},
  created_at: 0,
  updated_at: 0,
  deleted_at: null,
  ...extra,
});

const titles = (list: MediaRecord[]) => list.map((r) => r.title);

const arrival = record("Arrival", { rating: 90, fields: { release_date: "2016-11-11" }, updated_at: 3, created_at: 1 });
const dune = record("Dune", { template: "book", original_title: "Dune", fields: { publication_date: "1965" }, updated_at: 1, created_at: 3 });
const amelie = record("Amélie", { rating: 70, original_title: "Le Fabuleux Destin d'Amélie Poulain", updated_at: 2, created_at: 2 });
const all = [arrival, dune, amelie];

describe("queryLibrary", () => {
  it("sorts by last modified by default order, newest first", () => {
    expect(titles(queryLibrary(all, { sort: "modified" }))).toEqual(["Arrival", "Amélie", "Dune"]);
  });

  it("sorts by date added, title (ignoring accents), rating and release date", () => {
    expect(titles(queryLibrary(all, { sort: "added" }))).toEqual(["Dune", "Amélie", "Arrival"]);
    expect(titles(queryLibrary(all, { sort: "title" }))).toEqual(["Amélie", "Arrival", "Dune"]);
    // Best first; unrated last.
    expect(titles(queryLibrary(all, { sort: "rating" }))).toEqual(["Arrival", "Amélie", "Dune"]);
    // Newest first; mixed precision ("1965" vs "2016-11-11"); no date last.
    expect(titles(queryLibrary(all, { sort: "release" }))).toEqual(["Arrival", "Dune", "Amélie"]);
  });

  it("searches the title and original title, ignoring case and accents", () => {
    expect(titles(queryLibrary(all, { sort: "title", search: "AMELIE" }))).toEqual(["Amélie"]);
    expect(titles(queryLibrary(all, { sort: "title", search: "fabuleux" }))).toEqual(["Amélie"]);
    expect(queryLibrary(all, { sort: "title", search: "zzz" })).toEqual([]);
  });

  it("filters by one or several types; none selected means all", () => {
    expect(titles(queryLibrary(all, { sort: "title", templates: ["book"] }))).toEqual(["Dune"]);
    expect(titles(queryLibrary(all, { sort: "title", templates: ["book", "movie"] }))).toHaveLength(3);
    expect(titles(queryLibrary(all, { sort: "title", templates: [] }))).toHaveLength(3);
  });

  it("does not change the input", () => {
    const input = [...all];
    queryLibrary(input, { sort: "title" });
    expect(input).toEqual(all);
  });
});

describe("releaseDate", () => {
  it("reads the release field of each type", () => {
    expect(releaseDate(arrival)).toBe("2016-11-11");
    expect(releaseDate(dune)).toBe("1965");
    expect(releaseDate(amelie)).toBeNull();
  });
});

describe("groupByTemplate", () => {
  it("groups in the given type order, keeping each group's order", () => {
    const groups = groupByTemplate(queryLibrary(all, { sort: "title" }), ["book", "movie"]);
    expect(groups.map((g) => [g.template, titles(g.records)])).toEqual([
      ["book", ["Dune"]],
      ["movie", ["Amélie", "Arrival"]],
    ]);
  });
});
