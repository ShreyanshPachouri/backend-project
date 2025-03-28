import mongoose, { Schema } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const {page = 1, limit = 10} = req.query

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, 'Video not found')
    }

    const commentsAggregate = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
                //matches comments made on the specific video
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'owner',
                foreignField: '_id',
                as: 'owner'
                //lookup the user's id and store it as the comment owner
            }
        },
        {
            $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'comment',
                as: 'likes'
                //lookup the likes made on the specific comment
            }
        },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                owner: { $first: "$owner"},
                isLiked: {
                    if: {$in: [req.user?._id, "$likes.likedBy"]},
                    then: true,
                    else: false
                }
            }
        },
        {
            $sort: {createdAt: -1}
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }
    
    const comments = await Comment.aggregatePaginate(commentsAggregate, options)
    
    return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"))
})

const addComment = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req?.user._id
    })

    if(!comment){
        throw new ApiError(500, "Failed to create comment")
    }

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment created sucessfully"))
})

const updateComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params
    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found")
    }

    if(comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not authorized to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {new: true}
    )

    if (!updatedComment) {
        throw new ApiError(500, "Failed to edit comment please try again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment edited successfully"))
})

const deleteComment = asyncHandler(async(req, res) => {
    const { commentId } = req.params

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this comment")
    }

    const isDeleted = await Comment.findByIdAndDelete(commentId)

    if(!isDeleted){
        throw new ApiError(500, "Failed to delete comment please try again");
    }

    await Like.deleteMany({
        comment: commentId
    })

    return res
    .status(200)
    .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"))
}) 

export { getVideoComments, addComment, updateComment, deleteComment };