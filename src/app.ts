import express from "express";
import multer from "multer";
import path from "path";
import sharp from "sharp";

const app = express();
const uploadHandler = multer({  });

app.get("/", (req, res) => {
    res.send(`
        <form action="/" method="post" enctype="multipart/form-data">
            <input type="file" name="file" id="file">
            <input type="submit" value="Upload" name="submit">
        </form>
    `);
});

app.post("/", uploadHandler.single('file'), (req, res) => {
    const file = req.file;

    if (!file) {
        res.status(400).send("No file uploaded.");
        return;
    }

    const image = sharp(file.buffer).grayscale().toFile(`uploads/${file.originalname}`)

    res.send(`
        <p>File Path: ${file.originalname}</p>
    `);
})

app.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = `uploads/${filename}`;

    console.log(`File Path: ${filePath}`);


    res.sendFile(filePath, { root: path.dirname(__dirname) });
});


app.listen(3000, () => {
	console.log(`Server is running on port 3000`);
});
