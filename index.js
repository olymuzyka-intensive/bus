import express from "express";
import { readFile } from "node:fs/promises";
import url from "node:url";
import path from "node:path";
import { DateTime } from "luxon";

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename)

const timeZone = "UTC"

const port = 3000;

const app = express();

const loadBuses = async () => {
    const data = await readFile(path.join(__dirname, "buses.json"), "utf-8");

    return JSON.parse(data)
};

const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
    const now = DateTime.now().setZone(timeZone);

    const [hours, minutes] = firstDepartureTime.split(':').map(Number);

    let departure = DateTime.now()
    .set({hours, minutes})
    .setZone(timeZone)

    if (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes})
    }

    const endOfDay = DateTime.now()
    .set({hours: 23, minutes: 59, seconds: 59})
    .setZone(timeZone)

    if (departure > endOfDay) {
        departure = departure.startOf('day').plus({days: 1}).set({hours, minutes})
    }

    while (now > departure) {
        departure = departure.plus({minutes: frequencyMinutes})

        if (departure > endOfDay) {
            departure = departure.startOf('day').plus({days: 1}).set({hours, minutes})
        }    
    }

    return departure;
}

const sendUpdatedData = async () => {
    const buses = await loadBuses(); 
    // const now = DateTime.now().setZone(timeZone);

    const updateBuses = buses.map(bus => {
        const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);

        // console.log('nextDeparture', nextDeparture)
    // buses.sort((a,b) => {a.firstDepartureTime - b.firstDepartureTime})


        return {...bus, nextDeparture: {
            data: nextDeparture.toFormat('yyyy-MM-dd'),
            time: nextDeparture.toFormat('HH:mm:ss'),
        }}
   })
   return updateBuses
}

app.get("/next-departure", async (req, res) => {
  try {
    const updateBuses = await sendUpdatedData();
    res.json(updateBuses)
    // console.log('updateBuses', updateBuses)
  } catch {
    res.send("error");
  }
});

app.listen(port, () => {
  console.log("Server running on http://localhost:" + port);
});
