import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; 
import 'react-toastify/dist/ReactToastify.css'; 

import Register from './components/Register';
import Login from './components/Login';
import Home from './components/Home';
import SellerRegister from './components/SellerRegister';
import './App.css';
import SellerAddProperty from './components/SellerAddProperty';
import SellerLogin from './components/SellerLogin';
import PropertyDetail from './components/PropertyDetail';
import SellerDashboard from './components/SellerDashboard';
import SellerProperties from './components/SellerProperties';
import PanVerify from './components/PanVerify';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import SellerForgotPassword from './components/SellerForgotPassword';
import Favorites from './components/Favorites';
import EditProperty from './components/EditProperty';
import ChatRoom from './components/ChatRoom';
import SellerMessages from './components/SellerMessages';
import ContactSeller from './components/ContactSeller';
import AdminDashboard from './components/AdminDashboard'; // ← ADD THIS

// Booking
import SellerBookings from './components/SellerBookings';
import MyBookings from './components/MyBookings';
import SellerPropertyDetail from './components/Sellerpropertydetail ';
import CustomerProfile from './components/CustomerProfile';
import CustomerMessages from './components/CustomerMessages';
import HelpCenter from './components/Helpcenter';
import SellerProfile from './components/Sellerprofile';

function App() {
  return (
    <>
      <Routes>
        {/* User Routes */}
        <Route path='reg' element={<Register/>}/>
        <Route path='login' element={<Login/>}/>
        <Route path='/' element={<Home/>}/>
        <Route path='/favorites' element={<Favorites/>}/>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        
        {/* Property Routes */}
        <Route path="/property/:id" element={<PropertyDetail />} />
        <Route path="/property/:id/edit" element={<EditProperty />} />
        
        {/* Chat Routes */}
        <Route path="/contact-seller/:propertyId" element={<ContactSeller />} />
        <Route path="/chat-room/:chatRoomId" element={<ChatRoom />} />
        
        {/* Seller Routes */}
        <Route path='sellerreg' element={<SellerRegister/>}/>
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/dashboard" element={<SellerDashboard />} />
        <Route path="/seller/properties" element={<SellerProperties />} />
        <Route path="/seller/messages" element={<SellerMessages />} />
        <Route path="/seller/forgot-password" element={<SellerForgotPassword />} />
        <Route path="/add" element={<SellerAddProperty />} />

        <Route path="/help" element={<HelpCenter />} />

        {/* PAN verify — both paths work */}
        <Route path="/seller/panverify" element={<PanVerify />} />
        <Route path="/seller/verify-pan" element={<PanVerify />} />

        {/* Bookings */}
        <Route path="/seller/bookings" element={<SellerBookings />} />

        {/* Admin */}
        <Route path="/admin" element={<AdminDashboard />} />  {/* ← ADD THIS */}

        <Route path="/my-bookings" element={<MyBookings />} />
        
        <Route path="/seller/property/:id" element={<SellerPropertyDetail />} />
        <Route path="/profile" element={<CustomerProfile/>} />

        <Route path="/messages" element={<CustomerMessages />} />
      
        <Route path="/seller/profile"  element={<SellerProfile />} />

      </Routes>

      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false} 
        newestOnTop={false} 
        closeOnClick 
        rtl={false} 
        pauseOnFocusLoss 
        draggable 
        pauseOnHover 
      />
    </>
  )
}

export default App;
