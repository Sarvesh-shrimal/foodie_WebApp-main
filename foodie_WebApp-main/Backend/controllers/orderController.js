import orderModel from "../models/orderModel.js";
import userModel from '../models/userModel.js'
import Stripe from 'stripe';


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

//placing user order fro frontend
let orderId 
const placeOrder = async(req, res) =>{

    const frontend_url = 'http://localhost:5173';

    try {
        const newOrder = new orderModel({
            userId:req.body.userId,
            items:req.body.items,
            amount:req.body.amount,
            address:req.body.address
        })
       

        await newOrder.save();
        orderId = newOrder._id;
        // res.json({success:'partial',orderId:newOrder._id})
        // console.log(newOrder._id)
        // res.json({orderId:newOrder._id})
        await userModel.findByIdAndUpdate(req.body.userId,{cartData:{}});

        const line_items = req.body.items.map((item)=>({
            price_data:{
                currency:"inr",
                product_data:{
                    name:item.name
                },
                unit_amount: item.price*100
            },
            quantity:item.quantity
        }))

        line_items.push({
            price_data:{
                currency:"inr",
                product_data:{
                    name:"Delivery Charges"
                },
                unit_amount:40*100
            },
            quantity:1

        })

        const session = await stripe.checkout.sessions.create({
            line_items:line_items,
            mode:'payment',
            success_url:`${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:`${frontend_url}/verify?success=false&orderId=${newOrder._id}`,
        })

        res.json({success:true, session_url:session.url})
        // ,
    } catch (error) {
        console.log(error)
        res.json({success:false, message:'error',orderId:orderId})
    }
}

const verifyOrder = async (req,res)=>{
    const {orderId, success} = req.body;

    try {
        if(success ==='true'){
            await orderModel.findByIdAndUpdate(orderId, {payment:true});
            res.json({success:true, message:'paid'})
        }

        else{
            await orderModel.findByIdAndDelete(orderId);
            res.json({success:false, message:'Not paid'})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false, message:"error"})
        
    }
}

const DeletItem = async(req, res)=>{
    const{orderId} = req.body;
    try {
        await orderModel.findByIdAndDelete(orderId);
        
    } catch (error) {
        res.status(500).send(error.message)
    }
}


//user order for frontend
const userOrder = async(req, res) =>{
    try {
        const orders = await orderModel.find({userId:req.body.userId})
        res.json({success:true, data:orders})
    } catch (error) {
        console.log(error)
        res.json({success:false, message:'error'})
    }
}

//listing order for admin
const listOrder = async(req,res)=>{
    try {
        const orders = await orderModel.find({});
        res.json({success:true, data:orders})
    } catch (error) {
        console.log(error)
        res.json({success:false, message:"error"})
        
    }
}

//api fro updating order status

const updateStatus = async(req,res)=>{
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status});
        res.json({success:true, message:'Status Updated'})
    } catch (error) {
        console.log(error)
        res.json({success:true, message:'error'})
        
    }
}

export {placeOrder,verifyOrder,userOrder,listOrder,updateStatus,DeletItem};