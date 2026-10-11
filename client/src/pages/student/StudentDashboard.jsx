// src/pages/student/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [quote, setQuote] = useState({});
  const [bgClass, setBgClass] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) setStudent(JSON.parse(user));

    // All quotes have authors
    const quotes = [
      {
        text: "“Success doesn’t come to you, you go to it.”",
        author: "Marva Collins",
      },
      {
        text: "“The expert in anything was once a beginner.”",
        author: "Helen Hayes",
      },
      {
        text: "“Don’t let what you cannot do interfere with what you can do.”",
        author: "John Wooden",
      },
      {
        text: "“Push yourself, because no one else is going to do it for you.”",
        author: "Rhyanna Watson",
      },
      {
        text: "“Learning never exhausts the mind.”",
        author: "Leonardo da Vinci",
      },
      {
        text: "“The beautiful thing about learning is that no one can take it away from you.”",
        author: "B.B. King",
      },
      {
        text: "“Mistakes are proof that you are trying.”",
        author: "Jennifer Lim",
      },
      {
        text: "“It always seems impossible until it’s done.”",
        author: "Nelson Mandela",
      },
      {
        text: "“Strive for progress, not perfection.”",
        author: "David Perlmutter",
      },
      {
        text: "“Your limitation—it’s only your imagination.”",
        author: "Tony Robbins",
      },
      { text: "“Dream big. Work hard. Stay humble.”", author: "Brad Meltzer" },
      {
        text: "“If you get tired, learn to rest, not to quit.”",
        author: "Banksy",
      },
      {
        text: "“Do something today that your future self will thank you for.”",
        author: "Sean Patrick Flanery",
      },
      {
        text: "“Success is the sum of small efforts, repeated day in and day out.”",
        author: "Robert Collier",
      },
      {
        text: "“Believe you can and you're halfway there.”",
        author: "Theodore Roosevelt",
      },
      {
        text: "“Discipline is the bridge between goals and accomplishment.”",
        author: "Jim Rohn",
      },
      {
        text: "“You don’t have to be great to start, but you have to start to be great.”",
        author: "Zig Ziglar",
      },
      {
        text: "“There are no shortcuts to any place worth going.”",
        author: "Beverly Sills",
      },
      {
        text: "“Education is the most powerful weapon which you can use to change the world.”",
        author: "Nelson Mandela",
      },
      { text: "“Stay hungry, stay foolish.”", author: "Steve Jobs" },
    ];

    // Random gradient backgrounds
    const gradients = [
      "from-indigo-600 to-purple-600",
      "from-pink-500 to-orange-400",
      "from-green-500 to-emerald-600",
      "from-blue-500 to-cyan-500",
      "from-yellow-500 to-red-500",
      "from-teal-400 to-blue-600",
      "from-rose-500 to-fuchsia-500",
      "from-amber-500 to-lime-500",
      "from-sky-500 to-indigo-600",
      "from-gray-700 to-gray-900",
    ];

    // Pick random quote & gradient
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const randomGradient =
      gradients[Math.floor(Math.random() * gradients.length)];

    setQuote(randomQuote);
    setBgClass(randomGradient);
  }, []);

  return (
    <div className="min-h-fit">
      <div className="mx-auto space-y-6">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-lg flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold">
              Welcome,{" "}
              {student?.fullName?.toString()?.toUpperCase() || "Student"} 👋
            </h1>
            <p className="text-white/80 mt-1">
              Keep learning and achieving great things!
            </p>
          </div>
          <Star className="w-12 h-12 text-yellow-300 animate-pulse" />
        </motion.div>

        {/* Random Motivational Quote */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className={`bg-gradient-to-r ${bgClass} text-white rounded-2xl p-6 shadow-md text-center`}
        >
          <p className="text-lg italic mb-2 transition-all duration-500">
            {quote.text}
          </p>
          <p className="text-sm text-white/80">– {quote.author}</p>
        </motion.div>
      </div>
    </div>
  );
}
