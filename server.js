import "dotenv/config";
import express from "express";
import connectDB from "./DB/connectDB.js";
import User from "./models/User.js";
import cors from "cors";
import Team from "./models/Team.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

app.get("/filters", async (req, res) => {
  try {
    const domainFilter = [
      {
        $group: {
          _id: "$domain",
        },
      },
    ];

    const genderFilter = [
      {
        $group: {
          _id: "$gender",
        },
      },
    ];

    const uniqueGenders = await User.aggregate(genderFilter);
    const uniqueDomains = await User.aggregate(domainFilter);
    res.json({ uniqueDomains, uniqueGenders });
  } catch (error) {
    console.error(error);
  }
});

app.get("/users", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const search = req.query.search;
    const limit = 20;
    if (page <= 0) return res.json({ users: [] });
    const excludeFields = ["page", "limit", "search"];
    const queryObject = { ...req.query };

    excludeFields.forEach((el) => {
      delete queryObject[el];
    });

    // &domain[]=IT&domain[]=Finance
    const temp = Array.isArray(queryObject?.domain)
      ? { domain: { $in: queryObject?.domain } }
      : {
          domain: {
            $eq:
              queryObject?.domain?.charAt(0).toUpperCase() +
              queryObject?.domain?.slice(1),
          },
        };
    delete queryObject.domain;

    let filter;
    if (Array.isArray(queryObject?.gender)) {
      const tempGender = Array.isArray(queryObject?.gender)
        ? { gender: { $in: queryObject?.gender } }
        : {};
      delete queryObject.gender;

      if (!req.query?.gender) {
        filter = { ...queryObject, ...temp };
      } else {
        filter = { ...queryObject, ...temp, ...tempGender };
      }
    } else {
      if (!queryObject?.gender) {
        filter = { ...queryObject, ...temp };
      } else {
        filter = {
          ...queryObject,
          ...temp,
          gender: {
            $eq:
              queryObject.gender?.charAt(0).toUpperCase() +
              queryObject.gender?.slice(1),
          },
        };
      }
    }

    // if (queryObject?.gender)
    //   queryObject.gender =
    //     queryObject.gender.charAt(0).toUpperCase() +
    //     queryObject.gender.slice(1);
    if (!req.query.domain) delete filter.domain;
    // console.log(filter);
    let searchCriteria;
    if (search.length > 0) {
      // filter.first_name = { $regex: new RegExp(search, "i") };
      const nameRegex = new RegExp(search, "i");
      searchCriteria = {
        $or: [{ first_name: nameRegex }, { last_name: nameRegex }],
      };
      if (filter.domain) searchCriteria.domain = filter.domain;
      if (filter.gender) searchCriteria.gender = filter.gender;
    } else {
      searchCriteria = filter;
    }

    const pageCount = await User.countDocuments(searchCriteria);
    const users = await User.find(searchCriteria)
      .skip((page - 1) * limit)
      .limit(limit);
    res.json({
      users,
      pageCount: Math.ceil(pageCount / limit),
      page,
    });
  } catch (error) {
    console.error(error);
  }
});

app.get("/user/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const user = await User.findById(uid);
    if (!user) return res.status(404);
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

app.put("/user/:uid", async (req, res) => {
  const { uid } = req.params;
  const { updateData } = req.body;
  try {
    const user = await User.findByIdAndUpdate(uid, updateData, { new: true });
    if (!user) return res.status(404);
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

app.delete("/user/:uid", async (req, res) => {
  const { uid } = req.params;
  try {
    const user = await User.findByIdAndDelete(uid);
    if (!user) return res.status(404);
    res.status(200);
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });
  res.status(201).json(user);
});

app.patch("/addMember/:uid", async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.uid,
    {
      available: false,
    },
    { new: true }
  );
  res.json(user);
});

app.post("/team", async (req, res) => {
  const { name, members } = req.body;
  try {
    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ message: "Invalid userIds format" });
    }

    const updatedCount = await User.updateMany(
      { _id: { $in: members } },
      { $set: { available: false } }
    );

    if (!updatedCount) {
      return res.status(500).json({ message: "Please try again!" });
    }

    const team = await Team.create({
      name,
      members,
    });

    if (!team) return res.status(404).json({ message: "Error creating team" });
    res.status(201).json(team);
  } catch (error) {
    console.log(error);
  }
});

app.get("/teams", async (req, res) => {
  try {
    const teams = await Team.find({});
    if (!teams) return res.status(200).json({ message: "Teams empty" });
    res.status(201).json(teams);
  } catch (error) {
    console.log(error);
  }
});

app.get("/team/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const team = await Team.findOne({ _id: id }).populate("members");
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.status(201).json(team);
  } catch (error) {
    console.log(error);
  }
});

app.listen(PORT, () => {
  connectDB();
  console.log("listening on port " + PORT);
});
