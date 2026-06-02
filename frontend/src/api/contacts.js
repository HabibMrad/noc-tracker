import client from "./client"
export const listContacts = () => client.get("/contacts").then((r) => r.data)
