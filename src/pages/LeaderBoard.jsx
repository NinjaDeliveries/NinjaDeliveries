import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Pagination,
  CircularProgress, // 🔄
} from "@mui/material";
import { db } from "../context/Firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import moment from "moment";

const Leaderboard = () => {
  const today = moment().startOf("day");
  const [page, setPage] = useState(1);
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(false); // 🔄
  const maxPages = 30;

  const fetchLeaderboard = async (pageOffset) => {
    setLoading(true); // 🔄 Start loader
    const date = moment(today).subtract(pageOffset - 1, "days");

    const start = Timestamp.fromDate(date.toDate());
    const end = Timestamp.fromDate(date.clone().endOf("day").toDate());

    const q = query(
      collection(db, "leaderboard"),
      where("timestamp", ">=", start),
      where("timestamp", "<=", end)
    );

    const snapshot = await getDocs(q);

    let data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    data.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.timestamp.seconds - b.timestamp.seconds;
    });

    const topThree = data.slice(0, 3);
    const result = [];

    for (let i = 0; i < topThree.length; i++) {
      const entry = topThree[i];

      const userSnap = await getDocs(
        query(collection(db, "users"), where("__name__", "==", entry.userId))
      );
      const user = userSnap.docs[0]?.data();

      const rewardSnap = await getDocs(
        query(collection(db, "rewards"), where("position", "==", i + 1))
      );
      const reward = rewardSnap.docs[0]?.data();

      result.push({
        ...entry,
        userName: user?.name || "Unknown",
        phoneNumber: user?.phoneNumber || "N/A",
        reward: reward?.description || "No reward",
        rewardImage: reward?.image || "",
        position: i + 1,
      });
    }

    setTopUsers(result);
    setLoading(false); // 🔄 Stop loader
  };

  useEffect(() => {
    fetchLeaderboard(page);
  }, [page]);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        🏆 Top 3 Winners —{" "}
        {moment(today)
          .subtract(page - 1, "days")
          .format("DD MMM YYYY")}
      </Typography>

      {loading ? ( // 🔄 Loader while loading
        <Box display="flex" justifyContent="center" mt={6}>
          <CircularProgress size={50} />
        </Box>
      ) : topUsers.length === 0 ? (
        <Typography>No leaderboard entries for this day.</Typography>
      ) : (
        topUsers.map((user) => (
          <Card
            key={user.id}
            sx={{
              mb: 2,
              display: "flex",
              alignItems: "center",
              p: 2,
              borderRadius: 2,
              backgroundColor: "#f1f1f1",
            }}
          >
            <Avatar
              src={user.rewardImage}
              alt={user.reward}
              sx={{ width: 64, height: 64, mr: 2 }}
            />
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h6">
                #{user.position} - {user.userName}
              </Typography>
              <Typography variant="body2">📞 {user.phoneNumber}</Typography>
              <Typography variant="body2">
                ✅ {user.correctCount}/{user.totalQuestions} – 📈 {user.score} (
                {user.scorePercentage}%)
              </Typography>
              <Typography variant="body2">
                🕒 {moment(user.timestamp.toDate()).format("hh:mm A")}
              </Typography>
              <Typography variant="body2">🎁 {user.reward}</Typography>
            </CardContent>
          </Card>
        ))
      )}

      {/* Pagination */}
      <Box display="flex" justifyContent="center" mt={4}>
        <Pagination
          count={maxPages}
          page={page}
          onChange={(e, value) => {
            if (!loading) setPage(value); // 🔄 Disable while loading
          }}
          color="primary"
          disabled={loading} // 🔄 Optional
        />
      </Box>
    </Box>
  );
};

export default Leaderboard;
