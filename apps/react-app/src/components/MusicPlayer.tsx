// MusicPlayer.tsx
import React, { useState, useRef, useEffect } from "react";
import styles from "../assets/styles/MusicPlayer.module.css";

// Importez dynamiquement tous les fichiers mp3 du dossier "music"
const musicFilesContext = (require as any).context(
	"../../public/music",
	false,
	/\.mp3$/
);

const tracks = musicFilesContext.keys().map(musicFilesContext);

const MusicPlayer: React.FC = () => {
	const [isPlaying, setIsPlaying] = useState<boolean>(false);
	const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [volume, setVolume] = useState(0.7);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const percentage = duration ? (currentTime / duration) * 100 : 0;
	const [animKey, setAnimKey] = useState(0);

	const togglePlay = () => {
		if (audioRef.current) {
			if (isPlaying) {
				audioRef.current.pause();
			} else {
				audioRef.current.play();
			}
			setIsPlaying(!isPlaying);
		}
	};

	const playPreviousTrack = () => {
		if (currentTrackIndex === 0) {
			setCurrentTrackIndex(tracks.length - 1);
		} else {
			setCurrentTrackIndex(currentTrackIndex - 1);
		}
		setAnimKey(Date.now());
	};

	const playNextTrack = () => {
		if (currentTrackIndex === tracks.length - 1) {
			setCurrentTrackIndex(0);
		} else {
			setCurrentTrackIndex(currentTrackIndex + 1);
		}
		setAnimKey(Date.now());
	};

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.load(); // recharger la source actuelle
			if (isPlaying) {
				audioRef.current.play();
			}
		}
	}, [currentTrackIndex]);

	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume;
		}
	}, [volume]);

	const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!audioRef.current) return;
		const newTime = parseFloat(e.target.value);
		audioRef.current.currentTime = newTime;
		setCurrentTime(newTime);
	};

	const handleTrackEnd = () => {
		let nextIndex = currentTrackIndex + 1;
		if (nextIndex >= tracks.length) {
			nextIndex = 0; // boucle au début si on est à la dernière piste
		}
		setCurrentTrackIndex(nextIndex);
	};

	const handleTimeUpdate = () => {
		if (!audioRef.current) return;
		setCurrentTime(audioRef.current.currentTime);
	};

	const handleLoadedData = () => {
		if (!audioRef.current) return;
		setDuration(audioRef.current.duration);
	};

	const getTrackName = (path: string) => {
		const parts = path.split("/");
		const filename = parts[parts.length - 1];
		const nameParts = filename.split(".");
		nameParts.pop();
		nameParts.pop();
		return nameParts;
	};

	return (
		<div className={styles.fullContainer}>
			<div className={styles.mediaControllerContainer}>
				<audio
					onTimeUpdate={handleTimeUpdate}
					onLoadedData={handleLoadedData}
					onEnded={handleTrackEnd}
					ref={audioRef}
					src={tracks[currentTrackIndex]}
				/>
				<div className={styles.screenContainer}>
					<div className={styles.screen}>
						<div className={styles.titleContainer} key={animKey}>
							<h3 className={styles.title}>
								{getTrackName(tracks[currentTrackIndex])}
							</h3>
							<h3 className={styles.title}>
								{getTrackName(tracks[currentTrackIndex])}
							</h3>
						</div>
						<input
							// disabled={true}
							type="range"
							min="0"
							max={duration} // duration of the track
							value={currentTime}
							onChange={handleProgressChange}
							className={styles.progressSlider}
							style={{
								background: `linear-gradient(90deg, #1c0032aa ${percentage}%, #34005b70 ${percentage}%)`,
							}}
						/>
					</div>
				</div>
				<div className={styles.buttonContainer}>
					{" "}
					<button
						className={styles.tapeButton}
						onClick={playPreviousTrack}
					>
						◄◄
					</button>
					<button
						className={`${styles.tapeButton} ${
							isPlaying ? styles.pause : styles.play
						}`}
						onClick={togglePlay}
					>
						►
					</button>
					<button
						className={styles.tapeButton}
						onClick={playNextTrack}
					>
						►►
					</button>
				</div>
			</div>
			<div className={styles.volumeContainer}>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={volume}
					onChange={(e) => setVolume(parseFloat(e.target.value))}
					className={styles.volumeSlider}
				/>
			</div>
		</div>
	);
};

export default MusicPlayer;
