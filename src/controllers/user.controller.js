import { asyncHandler } from "../utils/asyncHandler.js";

// const registerUser = asyncHandler(async(req, res) => {
//     res.status(200).json({
//         message: "ok"
//     })
// })

const registerUser = asyncHandler(async (req, res) => {
    console.log("Inside registerUser controller");
    console.log("Request body:", req.body); // Log request data

    res.status(200).json({
        message: "ok"
    });
});

export {registerUser}
