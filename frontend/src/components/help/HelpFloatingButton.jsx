// frontend/src/components/help/HelpFloatingButton.jsx
import React from "react";
import { motion } from "framer-motion";

export default function HelpFloatingButton({ onClick, imageSrc }) {
  return (
    <div style={styles.wrap}>
      <motion.button
        type="button"
        onClick={onClick}
        style={styles.btn}
        aria-label="Abrir ajuda"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {imageSrc ? (
          <img src={imageSrc} alt="Help" style={styles.img} draggable={false} />
        ) : (
          <span style={styles.fallback}>?</span>
        )}

        <motion.div
          style={styles.bubble}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          Help
          <span style={styles.bubbleTail} />
        </motion.div>
      </motion.button>
    </div>
  );
}

const styles = {
  wrap: {
    position: "fixed",
    right: 18,
    bottom: 18,
    zIndex: 45000,
  },
  btn: {
    position: "relative",
    width: 64,
    height: 64,
    padding: 0,
    border: "none",
    cursor: "pointer",
    background: "transparent",
    outline: "none",
    filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.55))",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    display: "block",
    userSelect: "none",
  },
  fallback: {
    width: 64,
    height: 64,
    display: "grid",
    placeItems: "center",
    borderRadius: 18,
    background: "rgba(0,0,0,0.55)",
    color: "#fff",
    fontWeight: 900,
    fontSize: 20,
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(8px)",
  },
  bubble: {
    position: "absolute",
    right: "100%",
    bottom: 14,
    marginRight: 10,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 800,
    color: "#0b1220",
    background: "linear-gradient(135deg, #facc15, #f59e0b)",
    whiteSpace: "nowrap",
  },
  bubbleTail: {
    position: "absolute",
    right: -6,
    bottom: 10,
    width: 10,
    height: 10,
    background: "linear-gradient(135deg, #facc15, #f59e0b)",
    transform: "rotate(45deg)",
    borderRadius: 2,
  },
};
