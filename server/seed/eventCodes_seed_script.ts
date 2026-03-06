import fs from "fs";
import path from "path";
import { db } from "../db";
import { eventCodes } from "@shared/db";

type Row = {
  code: string
  parentCode: string | null
  name: string
  level: number
  quadClass: number | null
  goldsteinScore: number | null
}

function detectLevel(code: string) {
  if (code.length === 2) return 1
  if (code.length === 3) return 2
  if (code.length === 4) return 3
  return 0
}

function parent(code: string): string | null {
  if (code.length === 2) return null
  if (code.length === 3) return code.slice(0,2)
  if (code.length === 4) return code.slice(0,3)
  return null
}

async function main() {

  const eventLookup = fs.readFileSync(
    path.resolve("data/CAMEO_event_codes.tsv"),
    "utf8"
  )

  const goldsteinLookup = fs.readFileSync(
    path.resolve("data/CAMEO_goldstein.tsv"),
    "utf8"
  )

  const goldsteinMap = new Map<string, number>()

  goldsteinLookup
    .split("\n")
    .slice(1)
    .forEach(line => {
      const [code, score] = line.split("\t")
      if (code && score) {
        goldsteinMap.set(code, Number(score))
      }
    })

  const rows: Row[] = []

  eventLookup
  .split("\n")
  .slice(1)
  .forEach(line => {

    if (!line.trim()) return

    const [rawCode, rawName] = line.split(",")

    const code = rawCode?.trim()
    const name = rawName?.trim()

    if (!code || !name) return

    const codeRegex = /^\d{2,4}$/
    if (!codeRegex.test(code)) return

    rows.push({
      code,
      parentCode: parent(code),
      name,
      level: detectLevel(code),
      quadClass: null,
      goldsteinScore: goldsteinMap.get(code) ?? null
    })

  })

  await db.insert(eventCodes).values(rows)

  console.log(`Inserted ${rows.length} CAMEO codes`)
}

main()