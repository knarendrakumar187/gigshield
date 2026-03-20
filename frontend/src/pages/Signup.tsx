import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { api } from '../services/api';

const indiaLocations: Record<string, string[]> = {
  "Hyderabad": ["Madhapur", "Gachibowli", "Hitec City", "Kukatpally", "Banjara Hills", "Jubilee Hills", "Secunderabad", "Begumpet", "Kondapur", "Uppal", "Miyapur", "Tolichowki", "Ameerpet", "Dilsukhnagar"],
  "Bengaluru": ["Koramangala", "Indiranagar", "HSR Layout", "Whitefield", "BTM Layout", "Jayanagar", "Marathahalli", "Electronic City", "Malleswaram", "JP Nagar", "Bellandur", "Kammanahalli", "Basavanagudi", "Yelahanka"],
  "Delhi": ["Connaught Place", "Saket", "Vasant Kunj", "Hauz Khas", "Dwarka", "Rohini", "Karol Bagh", "Lajpat Nagar", "Chandni Chowk", "Nehru Place", "Rajouri Garden", "Pitampura", "Janakpuri", "Vasant Vihar"],
  "Mumbai": ["Andheri", "Bandra", "Colaba", "Dadar", "Juhu", "Powai", "Goregaon", "Malad", "Navi Mumbai", "Thane", "Borivali", "Kurla", "Lower Parel", "South Mumbai"],
  "Chennai": ["T Nagar", "Adyar", "Velachery", "Anna Nagar", "Mylapore", "Guindy", "OMR", "Tambaram", "Porur", "Nungambakkam", "Besant Nagar", "Thiruvanmiyur", "Vadapalani", "Perambur"],
  "Pune": ["Koregaon Park", "Viman Nagar", "Hinjewadi", "Kothrud", "Baner", "Wakad", "Kalyani Nagar", "Magarpatta", "Hadapsar", "Aundh", "Pimpri", "Chinchwad", "Shivajinagar", "Camp"],
  "Kolkata": ["Salt Lake", "New Town", "Park Street", "Ballygunge", "Howrah", "Alipore", "Dum Dum", "Jadavpur", "Rajarhat", "Gariahat", "Behala", "Garia", "Bidhannagar", "Tollygunge"],
  "Ahmedabad": ["Vastrapur", "Satellite", "Navrangpura", "SG Highway", "Ellisbridge", "Maninagar", "Prahlad Nagar", "Bopal", "Paldi", "Ghatlodia", "Thaltej", "Bodakdev", "Chandkheda", "Bapunagar"],
  "Jaipur": ["Malviya Nagar", "Mansarovar", "Vaishali Nagar", "C-Scheme", "Raja Park", "Bapu Nagar", "Jagatpura", "Tonk Road", "Civil Lines", "Sodala", "Jhotwara", "Bani Park", "Sindhi Camp"],
  "Lucknow": ["Gomti Nagar", "Aliganj", "Hazratganj", "Indira Nagar", "Mahanagar", "Aminabad", "Chowk", "Kapurthala", "Vikas Nagar", "Aashiana", "Telibagh", "Chinhat", "Munsipulia"],
  "Chandigarh": ["Sector 17", "Sector 35", "Sector 43", "Sector 22", "Mani Majra", "Mohali", "Zirakpur", "Panchkula", "Sector 8", "Sector 9", "IT Park", "Sector 26", "Sector 15"],
  "Indore": ["Vijay Nagar", "Palasia", "Bhawarkua", "Rajwada", "Annapurna", "Saket Nagar", "Bengali Square", "Sudama Nagar", "Geeta Bhawan", "Mahalakshmi Nagar", "Bapat Square", "LIG Colony", "Pardesipura"],
  "Kochi": ["Edappally", "Kaloor", "Vyttila", "Marine Drive", "Kakkanad", "Fort Kochi", "Palarivattom", "Ernakulam", "Panampilly Nagar", "MG Road", "Aluva", "Tripunithura", "Kadavanthra"]
};

export default function Signup() {
  const nav = useNavigate();
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    phone: '',
    password: '',
    city: 'Hyderabad',
    platform: 'Swiggy',
    zone: 'Madhapur',
    income: 8000,
    hours: 40
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      // Auto-generate random username from email because Django Auth hard-requires it internally
      const autoUsername = formData.email.split('@')[0] + Math.floor(Math.random() * 10000);
      
      // 1. Register User
      await api('/auth/register', { 
        method: 'POST', 
        body: { ...formData, username: autoUsername }
      });
      // 2. Head to Login automatically
      nav('/login', { state: { message: 'Registration successful! Please login.' } });
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'city') {
      // If city changes, automatically set zone to the first available zone in the new city
      const fallbackZone = indiaLocations[value]?.[0] || '';
      setFormData(prev => ({ ...prev, city: value, zone: fallbackZone }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <Card className="mx-auto max-w-lg p-0 overflow-hidden shadow-lg">
      <div className="bg-gradient-to-br from-indigo-600 to-sky-500 p-6 text-white text-center">
        <div className="text-xl font-bold">Join GigShield</div>
        <div className="mt-1 text-sm text-white/90">Protect your delivery earnings against disruptions.</div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 grid gap-4">
        {error ? <div className="rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700 border border-rose-100">{error}</div> : null}
        
        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Full Name
            <input required name="first_name" value={formData.first_name} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="Rahul Kumar" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Phone Number
            <input required name="phone" value={formData.phone} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="+91 9876543210" />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Email Address
            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="rider@example.com" />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Password
            <input required type="password" name="password" value={formData.password} onChange={handleChange} minLength={6} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" placeholder="••••••••" />
          </label>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid gap-4 mt-2">
           <div className="text-sm font-bold text-slate-800 border-b pb-2">Delivery Profile (Hackathon Defaults)</div>
           
           <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                City / Region
                <select name="city" value={formData.city} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {Object.keys(indiaLocations).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Primary Zone
                <select name="zone" value={formData.zone} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  {(indiaLocations[formData.city] || []).map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </label>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Platform
                <select name="platform" value={formData.platform} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none bg-white">
                  <option value="Swiggy">Swiggy</option>
                  <option value="Zomato">Zomato</option>
                  <option value="Zepto">Zepto</option>
                  <option value="BlinkIt">BlinkIt</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-700">
                Weekly Income Target (₹)
                <input required type="number" name="income" value={formData.income} onChange={handleChange} className="mt-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </label>
           </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          variant="primary"
          className="mt-4 w-full py-2.5 shadow-md hover:shadow-lg transition-all text-base"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
        
        <div className="text-center text-sm text-slate-500 mt-2">
          Already have an account? <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Sign in</Link>
        </div>
      </form>
    </Card>
  );
}
