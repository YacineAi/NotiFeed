const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });

async function createUser(user) {
  const { data, error } = await supabase
  .from("notiplus")
  .insert([ user ]);
  
  if (error) {
      throw new Error("Error creating user : ", error);
  } else {
      return data
  }
};

async function updateUser(id, update) {
  const { data, error } = await supabase
  .from("notiplus")
  .update( update )
  .eq("uid", id);
  
  if (error) {
      throw new Error("Error updating user : ", error);
  } else {
      return data
  }
};

async function userDb(userId) {
const { data, error } = await supabase
.from("notiplus")
.select("*")
.eq("uid", userId);

if (error) {
  console.error("Error checking user:", error);
} else {
  return data
}
};

async function keysDb(userId) {
const { data, error } = await supabase
.from("keys")
.select("*")
.eq("key", userId);

if (error) {
  console.error("Error checking user:", error);
} else {
  return data
}
};

async function updatekey(id, update) {
const { data, error } = await supabase
.from("keys")
.update( update )
.eq("key", id);

if (error) {
    throw new Error("Error updating user : ", error);
} else {
    return data
}
};

module.exports = { createUser, updateUser, userDb, keysDb, updatekey };